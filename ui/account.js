/* Nút tài khoản 👤 (đăng nhập / đăng ký), danh sách sách đã đọc và nút "Đọc tiếp". */
import { Progress } from '../js/progress.js';
const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./account.css', import.meta.url).href; document.head.append(css);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const pct = p => (p.done ? 100 : Math.min(100, Math.round((p.idx + 1) / Math.max(1, p.total) * 100)));
let A = null, app, btn, chip, ov, box, tab = 'login', kind = 'home';

const close = () => ov.classList.remove('on');
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
function render() {
  const u = A?.Auth.user, list = Progress.list(), kids = [];
  if (!A) kids.push(h('div', { className: 'acc-note', textContent: 'Chưa kết nối được dịch vụ tài khoản. Bạn vẫn đọc bình thường; tiến độ được lưu trên máy này.' }));
  else if (!u) kids.push(h('h3', { textContent: 'Tài khoản' }), form(), h('div', { className: 'acc-note', textContent: 'Đăng nhập để lưu sách đã đọc và đọc tiếp trên mọi thiết bị. Chưa đăng nhập vẫn đọc bình thường.' }));
  else kids.push(h('div', { className: 'acc-top' }, h('h3', { textContent: '👤 ' + (u.displayName || 'Bạn') }), h('button', { textContent: 'Đăng xuất', onclick: () => A.Auth.logout() })));
  kids.push(h('h3', { textContent: u ? 'Sách của tôi' : 'Sách đã đọc trên máy này' }));
  if (!list.length) kids.push(h('div', { className: 'acc-note', textContent: 'Chưa có cuốn nào. Mở một cuốn kinh để bắt đầu.' }));
  list.slice(0, 40).forEach(p => kids.push(row(p)));
  box.replaceChildren(h('div', { className: 'acc-top' }, h('span'), h('button', { textContent: '✕', onclick: close })), ...kids);
}
function refresh(k) {
  if (k) kind = k;
  const last = Progress.list().find(p => !p.done) || null;
  if (last && kind === 'home') { chip.textContent = `▶ Đọc tiếp: ${last.title} (${pct(last)}%)`; chip.onclick = () => { chip.style.display = 'none'; app.open({ title: last.title, url: last.url }); }; chip.style.display = 'block'; }
  else chip.style.display = 'none';
  if (btn) btn.classList.toggle('on', !!A?.Auth.user);
  if (ov.classList.contains('on')) render();
}
export const Account = {
  refresh,
  async mount(a) {
    app = a;
    try { A = await import('../js/auth.js'); } catch (e) { console.warn('Không tải được Firebase:', e.message); A = null; }
    btn = h('button', { textContent: '👤', title: 'Tài khoản và sách của tôi', onclick: () => { render(); ov.classList.add('on'); } });
    const host = document.querySelector('.musbox'); if (host) host.append(btn); else { btn.classList.add('fixed'); document.body.append(btn); }
    btn.classList.add('acc-btn');
    chip = h('button', { className: 'acc-chip hud' }); box = h('div', { className: 'acc-box' });
    ov = h('div', { className: 'acc-ov', onclick: e => { if (e.target === ov) close(); } }, box); document.body.append(chip, ov);
    Progress.onChange = () => refresh();
    if (A) A.Auth.onChange(u => { Progress.setUser(u).then(() => refresh()); refresh(); });
    refresh();
  }
};
