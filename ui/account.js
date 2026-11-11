/* Nút Đăng nhập 👤, nút Sách của tôi 📚, danh sách đã/đang đọc, nút "Đọc tiếp" và lời nhắc đăng nhập (một lần). */
import { Progress } from '../js/progress.js';
const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./account.css', import.meta.url).href; document.head.append(css);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const pct = p => (p.done ? 100 : Math.min(100, Math.round((p.idx + 1) / Math.max(1, p.total) * 100)));
const note = t => h('div', { className: 'acc-note', textContent: t });
let A = null, app, btn, bookBtn, chip, ov, box, tab = 'login', kind = 'home', mode = 'account';

const close = () => ov.classList.remove('on');
const openPanel = m => { mode = m; render(); ov.classList.add('on'); };
function row(p) {
  return h('div', { className: 'acc-row' }, h('div', { className: 'acc-t', textContent: p.title }),
    h('div', { className: 'acc-bar' }, h('i', { style: `width:${pct(p)}%` })),
    h('div', { className: 'acc-s', textContent: p.done ? '✓ Đã đọc xong' : `Đoạn ${p.idx + 1}/${p.total} · ${pct(p)}%` }),
    h('button', { textContent: p.done ? 'Mở lại' : 'Đọc tiếp', onclick: () => { close(); app.open({ title: p.title, url: p.url }); } }));
}
function form() {
  const u = h('input', { placeholder: 'Tên đăng nhập (chữ thường, không dấu)', autocomplete: 'username', autocapitalize: 'none', maxLength: 20 });
  const d = h('input', { placeholder: 'Tên hiển thị (có dấu cũng được)', maxLength: 20 });
  const p = h('input', { type: 'password', placeholder: 'Mật khẩu (tối thiểu 6 ký tự)', autocomplete: tab === 'login' ? 'current-password' : 'new-password' });
  const err = h('div', { className: 'acc-err' });
  const go = h('button', { className: 'acc-go on', textContent: tab === 'login' ? 'Đăng nhập' : 'Đăng ký', onclick: async () => {
    err.textContent = ''; go.disabled = true;
    try { await A.Auth[tab === 'login' ? 'login' : 'register'](u.value, p.value, d.value); } catch (e) { err.textContent = e.message; }
    go.disabled = false; } });
  p.onkeydown = e => { if (e.key === 'Enter') go.click(); };
  const tabs = h('div', { className: 'acc-tabs' },
    h('button', { textContent: 'Đăng nhập', className: tab === 'login' ? 'on' : '', onclick: () => { tab = 'login'; render(); } }),
    h('button', { textContent: 'Đăng ký', className: tab === 'register' ? 'on' : '', onclick: () => { tab = 'register'; render(); } }));
  return h('div', {}, tabs, u, ...(tab === 'register' ? [d] : []), p, err, go);
}
function accountSection() {
  const u = A?.Auth.user;
  if (!A) return [note('Chưa kết nối được dịch vụ tài khoản. Bạn vẫn đọc bình thường; tiến độ được lưu trên máy này.')];
  if (!u) return [h('h3', { textContent: 'Tài khoản' }), form(), note('Đăng nhập để lưu sách đã đọc và đọc tiếp trên mọi thiết bị. Chưa đăng nhập vẫn đọc bình thường.')];
  return [h('div', { className: 'acc-top' }, h('h3', { textContent: '👤 ' + (u.displayName || 'Bạn') }), h('button', { textContent: 'Đăng xuất', onclick: () => A.Auth.logout() }))];
}
function booksSection() {
  const list = Progress.list(), rd = list.filter(p => !p.done), dn = list.filter(p => p.done), k = [];
  k.push(h('h3', { textContent: (A?.Auth.user ? 'Sách của tôi' : 'Sách trên máy này') + ` · đang đọc (${rd.length})` }));
  if (!rd.length) k.push(note('Chưa có cuốn nào đang đọc. Mở một cuốn kinh để bắt đầu.'));
  rd.slice(0, 30).forEach(p => k.push(row(p)));
  if (dn.length) { k.push(h('h3', { textContent: `Đã đọc xong (${dn.length})` })); dn.slice(0, 30).forEach(p => k.push(row(p))); }
  return k;
}
function render() {
  const a = accountSection(), b = booksSection();
  box.replaceChildren(h('div', { className: 'acc-top' }, h('span'), h('button', { textContent: '✕', onclick: close })), ...(mode === 'books' ? [...b, ...a] : [...a, ...b]));
}
function labels() {
  const u = A?.Auth.user, rd = Progress.list().filter(p => !p.done).length;
  btn.replaceChildren('👤', h('span', { className: 'acc-label', textContent: ' ' + (u ? (u.displayName || 'Tôi') : 'Đăng nhập') })); btn.classList.toggle('on', !!u);
  bookBtn.replaceChildren('📚', h('span', { className: 'acc-label', textContent: ' Sách của tôi' }), ...(rd ? [h('span', { className: 'acc-count', textContent: String(rd) })] : []));
}
function refresh(k) {
  if (k) kind = k;
  const last = Progress.list().find(p => !p.done) || null;
  if (last && kind === 'home') { chip.textContent = `▶ Đọc tiếp: ${last.title} (${pct(last)}%)`; chip.onclick = () => { chip.style.display = 'none'; app.open({ title: last.title, url: last.url }); }; chip.style.display = 'block'; }
  else chip.style.display = 'none';
  labels(); if (ov.classList.contains('on')) render();
}
export const Account = {
  refresh,
  nudge() {                                                       // khách đọc tới cuốn thứ hai: nhắc đăng nhập đúng một lần
    try { if (A?.Auth.user || localStorage.getItem('acc:nudged') || Progress.list().length < 2) return; localStorage.setItem('acc:nudged', '1'); } catch { return; }
    const t = h('div', { className: 'acc-toast' }, 'Đăng nhập để lưu sách đã đọc trên mọi thiết bị. ', h('button', { textContent: 'Đăng nhập', onclick: () => { t.remove(); tab = 'login'; openPanel('account'); } }));
    document.body.append(t); setTimeout(() => t.remove(), 9000);
  },
  async mount(a) {
    app = a;
    try { A = await import('../js/auth.js'); } catch (e) { console.warn('Không tải được Firebase:', e.message); A = null; }
    bookBtn = h('button', { className: 'acc-btn', title: 'Sách của tôi', onclick: () => openPanel('books') });
    btn = h('button', { className: 'acc-btn', title: 'Đăng nhập / tài khoản', onclick: () => openPanel('account') });
    const host = document.querySelector('.musbox');
    if (host) host.append(bookBtn, btn); else document.body.append(h('div', { className: 'acc-fixed' }, bookBtn, btn));
    chip = h('button', { className: 'acc-chip hud' }); box = h('div', { className: 'acc-box' });
    ov = h('div', { className: 'acc-ov', onclick: e => { if (e.target === ov) close(); } }, box); document.body.append(chip, ov);
    Progress.onChange = () => refresh();
    if (A) A.Auth.onChange(u => { Progress.setUser(u).then(() => refresh()); refresh(); });
    refresh();
  }
};
