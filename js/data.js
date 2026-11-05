// Lấy và phân tích HTML của budsas.net. Không đụng tới giao diện.
export const ORIGIN = 'https://budsas.net';
const PROXY = '/b';                       // Render rewrite: /b/* -> https://budsas.net/*
const cache = new Map();
const clean = s => s.replace(/\s+/g, ' ').trim();

export async function fetchDoc(url) {
  if (cache.has(url)) return cache.get(url);
  const r = await fetch(PROXY + url.replace(ORIGIN, ''));
  if (!r.ok) throw new Error('Không tải được trang (HTTP ' + r.status + ')');
  const html = new TextDecoder('utf-8').decode(await r.arrayBuffer());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  cache.set(url, doc); return doc;
}
function linksOf(root, base) {
  const seen = new Set(), out = [];
  root.querySelectorAll('a[href]').forEach(a => {
    let u; try { u = new URL(a.getAttribute('href'), base).href.split('#')[0]; } catch { return; }
    u = u.replace(/^https?:\/\/(www\.)?budsas\.net/, ORIGIN);
    const t = clean(a.textContent);
    if (!u.startsWith(ORIGIN) || t.length < 2 || seen.has(u) || u.endsWith('/uni/index.htm')) return;
    if (/^(trở về|home|quay về|lên đầu)/i.test(t)) return;
    seen.add(u); out.push({ title: t, url: u });
  });
  return out;
}
function headingFor(ul) {
  let el = ul.previousElementSibling;
  for (let i = 0; el && i < 4; i++, el = el.previousElementSibling) {
    const t = clean(el.textContent);
    if (t && t.length < 60 && !el.querySelector('a') && el.tagName !== 'UL') return t;
  }
  const td = ul.closest('td,th');
  if (td) {
    const tr = td.parentElement, idx = [...tr.children].indexOf(td);
    for (let row = tr.previousElementSibling; row; row = row.previousElementSibling) {
      const c = row.children[idx] || row.children[0];
      const t = c && clean(c.textContent);
      if (t && t.length < 60 && !c.querySelector('a')) return t;
    }
  }
  return 'Kệ khác';
}
// Trang chủ -> [{title, books:[{title,url}]}]  (mỗi mục = 1 giá sách)
export function parseHome(doc, url) {
  const map = new Map();
  doc.querySelectorAll('ul').forEach(ul => {
    if (ul.parentElement.closest('ul')) return;
    const books = linksOf(ul, url); if (!books.length) return;
    const t = headingFor(ul);
    if (!map.has(t)) map.set(t, []);
    map.get(t).push(...books);
  });
  if (!map.size) { const b = linksOf(doc.body, url); if (b.length) map.set('Tất cả', b); }
  return [...map].map(([title, books]) => ({ title, books }));
}
// Trang con -> {kind:'index', title, books} hoặc {kind:'text', title, paras, url}
export function parsePage(doc, url) {
  const title = clean(doc.querySelector('title')?.textContent || 'Không tên');
  const links = linksOf(doc.body, url);
  const len = clean(doc.body.textContent).length;
  if (links.length >= 8 && len < links.length * 350) return { kind: 'index', title, books: links, url };
  const b = doc.body.cloneNode(true);
  b.querySelectorAll('script,style').forEach(e => e.remove());
  const w = doc.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) n.nodeValue = n.nodeValue.replace(/\s+/g, ' ');
  b.querySelectorAll('br').forEach(e => e.replaceWith('\n'));
  b.querySelectorAll('p,div,tr,li,h1,h2,h3,h4,h5,h6,blockquote,center').forEach(e => { e.prepend('\n'); e.append('\n'); });
  const paras = b.textContent.split(/\n+/).map(clean)
    .filter(p => p.length > 1 && !/Home Page|Unicode Times|^BuddhaSasana/.test(p));
  return { kind: 'text', title, paras, url };
}
