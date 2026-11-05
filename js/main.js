// Điều phối: dữ liệu + TTS + nhạc. Giao diện nằm ở ui/. Muốn bản 3D: đổi dòng import UI bên dưới.
import { UI } from '../ui/ui3d.js';          // <- đổi lại '../ui/ui2d.js' nếu muốn bản 2D
import { ORIGIN, fetchDoc, parseHome, parsePage } from './data.js';
import { tts } from './tts.js';
import { music } from './music.js';

const HOME = ORIGIN + '/uni/index.htm';
const stack = [];                              // {kind:'home'|'shelf'|'read', title, data}
const posKey = u => 'pos:' + u;

function show(e) {
  const crumbs = stack.map(s => s.title);
  if (e.kind === 'home') UI.showHome(e.data, crumbs);
  else if (e.kind === 'shelf') UI.showShelf(e.data, crumbs);
  else UI.showReader(e.data, crumbs, +localStorage.getItem(posKey(e.data.url)) || 0);
}
const app = {
  tts, music,
  async home() {
    tts.stop(); stack.length = 0; UI.loading('Đang mở thư viện…');
    try {
      const sections = parseHome(await fetchDoc(HOME), HOME);
      if (!sections.length) throw new Error('Không nhận ra cấu trúc trang chủ');
      stack.push({ kind: 'home', title: 'Thư viện', data: sections }); show(stack[0]);
    } catch (e) { UI.error(e.message); }
  },
  async open(book) {
    tts.stop(); UI.loading('Đang mở “' + book.title + '”…');
    try {
      const p = parsePage(await fetchDoc(book.url), book.url);
      p.title = book.title || p.title;
      const e = { kind: p.kind === 'index' ? 'shelf' : 'read', title: p.title, data: p };
      if (e.kind === 'read') tts.load(p.paras);
      stack.push(e); show(e);
    } catch (e) { UI.error(e.message, true); }
  },
  back() { if (stack.length < 2) return; tts.stop(); stack.pop(); show(stack.at(-1)); },
  jump(n) { while (stack.length > n + 1) stack.pop(); tts.stop(); show(stack.at(-1)); }
};
tts.onPara = i => { UI.setReading(i); const e = stack.at(-1); if (e?.kind === 'read') localStorage.setItem(posKey(e.data.url), i); };
tts.onState = s => { UI.setTtsState(s); music.duck(s === 'playing'); };
music.onChange = () => UI.setMusic(music.name, music.playing);

UI.init(app); music.init(); app.home();
