/* GIAO DIỆN 2D. Muốn làm 3D: viết ui3d.js xuất cùng đối tượng `UI` với các hàm:
   init(app)  loading(msg)  error(msg, canBack)
   showHome(sections, crumbs)      sections=[{title, books:[{title,url}]}]  -> mỗi section là 1 kệ
   showShelf({title, books}, crumbs)
   showReader({title, paras, url}, crumbs, startIdx)
   setReading(i)  setTtsState('playing'|'paused'|'stop')  setMusic(name, playing)
   Gọi ngược về logic qua `app`: app.open(book) app.back() app.home() app.jump(n)
   app.tts.{play(i),pause(),resume(),stop(),setRate(r),hasVoice(),state}  app.music.{toggle(),next(),setVolume(v)} */
const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./ui2d.css', import.meta.url).href; document.head.append(css);
const COLORS = ['#8b2e2e', '#2e5a8b', '#2e7a4f', '#7a4f2e', '#6a2e8b', '#8b6a2e', '#2e7a7a', '#5a2e3d', '#3d5a2e', '#4a4a7a'];
const hash = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
let app, main, crumbsEl, musBtn, musName, reader, paraEls = [], playBtn;

function shelf(title, books) {
  const s = h('div', { className: 'shelf' });
  books.forEach(b => s.append(h('button', {
    className: 'book', title: b.title, textContent: b.title,
    style: `background:${COLORS[hash(b.title) % COLORS.length]};height:${120 + hash(b.title) % 60}px`,
    onclick: () => app.open(b)
  })));
  return h('section', {}, h('h2', { className: 'st', textContent: '📚 ' + title }), s);
}
function setCrumbs(c = []) {
  crumbsEl.textContent = '';
  c.forEach((t, i) => {
    if (i) crumbsEl.append(' › ');
    crumbsEl.append(i === c.length - 1 ? t : h('a', { textContent: t, onclick: () => app.jump(i) }));
  });
}
function closeReader() { reader?.remove(); reader = null; }
function page(c, ...nodes) { closeReader(); setCrumbs(c); main.replaceChildren(...nodes); window.scrollTo(0, 0); }

export const UI = {
  closeReader,
  init(a) {
    app = a;
    musBtn = h('button', { textContent: '♪', title: 'Nhạc đệm', onclick: () => { if (!app.music.toggle()) alert('Chưa có nhạc. Bỏ mp3 vào thư mục music/ và khai báo trong music/list.json'); } });
    musName = h('span', { textContent: 'Chưa có nhạc' });
    crumbsEl = h('div', { className: 'crumbs' }); main = h('main');
    document.getElementById('app').append(
      h('div', { className: 'hd' }, h('h1', { textContent: '📿 Thư Viện Kinh', onclick: () => app.home() }),
        h('div', { className: 'mus' }, musBtn, h('button', { textContent: '⏭', onclick: () => app.music.next() }), musName,
          h('input', { type: 'range', min: 0, max: 1, step: .05, value: .4, oninput: e => app.music.setVolume(+e.target.value) }))),
      crumbsEl, main);
  },
  loading(m) { main.replaceChildren(h('div', { className: 'msg', textContent: m })); },
  error(m, canBack) {
    closeReader();
    main.replaceChildren(h('div', { className: 'msg' }, 'Lỗi: ' + m, h('br'), h('br'),
      canBack ? h('button', { textContent: '← Quay lại', onclick: () => app.back() }) : h('button', { textContent: 'Thử lại', onclick: () => app.home() })));
  },
  showHome(sections, c) { page(c, ...sections.map(s => shelf(s.title, s.books))); },
  showShelf(d, c) { page(c, h('button', { textContent: '← Quay lại', onclick: () => app.back() }), shelf(d.title, d.books)); },
  showReader(d, c, start = 0) {
    setCrumbs(c);
    const body = h('div', { className: 'in' }, h('h2', { textContent: d.title }));
    paraEls = d.paras.map((t, i) => body.appendChild(h('p', { textContent: t, onclick: () => app.tts.play(i) })));
    body.append(h('div', { className: 'src' }, 'Nguồn: ', h('a', { href: d.url, target: '_blank', rel: 'noopener', textContent: 'budsas.net' })));
    let fs = 19; const setFs = n => { fs = n; body.style.fontSize = fs + 'px'; }; setFs(fs);
    playBtn = h('button', { textContent: '▶ Đọc', onclick: () => {
      const t = app.tts;
      if (t.state === 'playing') t.pause(); else if (t.state === 'paused') t.resume(); else {
        t.play(Math.max(0, paraEls.findIndex(p => p.classList.contains('on'))));
      }
    } });
    const rate = h('span', { textContent: '1.0x' });
    const bar = h('div', { className: 'rb' },
      h('button', { textContent: '← Quay lại', onclick: () => app.back() }),
      h('span', { className: 't', textContent: d.title }), playBtn,
      h('button', { textContent: '■', title: 'Dừng', onclick: () => app.tts.stop() }),
      '🐢', h('input', { type: 'range', min: .5, max: 2, step: .1, value: 1, oninput: e => { rate.textContent = (+e.target.value).toFixed(1) + 'x'; app.tts.setRate(+e.target.value); } }), '🐇', rate,
      h('button', { textContent: 'A−', onclick: () => setFs(Math.max(14, fs - 2)) }), h('button', { textContent: 'A+', onclick: () => setFs(fs + 2) }),
      h('button', { textContent: '🌙', onclick: () => reader.classList.toggle('dark') }));
    closeReader(); reader = h('div', { className: 'rd' }, bar, h('div', { className: 'tx' }, body)); document.body.append(reader);
    if (start && paraEls[start]) { paraEls[start].classList.add('on'); setTimeout(() => paraEls[start].scrollIntoView({ block: 'center' }), 50); }
  },
  setReading(i) {
    paraEls.forEach(p => p.classList.remove('on'));
    const p = paraEls[i]; if (p) { p.classList.add('on'); p.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  },
  setTtsState(s) { if (playBtn) playBtn.textContent = s === 'playing' ? '⏸ Tạm dừng' : s === 'paused' ? '▶ Tiếp tục' : '▶ Đọc'; },
  setMusic(n, on) { if (musName) { musName.textContent = n; musBtn.textContent = on ? '⏸' : '♪'; } }
};
