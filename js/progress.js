// Tiến độ đọc: lưu trong trình duyệt (khách) và đồng bộ lên Firestore khi đã đăng nhập. Không phụ thuộc giao diện.
const KEY = 'prog:v1', MAX = 200;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = o => { try { const ks = Object.keys(o); if (ks.length > MAX) ks.sort((a, b) => o[a].updatedAt - o[b].updatedAt).slice(0, ks.length - MAX).forEach(k => delete o[k]); localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };
const id = u => { let a = 5381, b = 52711; for (const c of u) { a = (a * 33) ^ c.charCodeAt(0); b = (b * 31 + c.charCodeAt(0)) | 0; } return 'b' + (a >>> 0).toString(36) + (b >>> 0).toString(36); };
let uid = null, timer = 0, mod = null; const dirty = new Set();
const cloud = async () => { if (mod === null) { try { mod = await import('./auth.js'); } catch { mod = false; } } return mod; };

export const Progress = {
  onChange() {},
  idx: url => load()[id(url)]?.idx || 0,
  list: () => Object.values(load()).sort((a, b) => b.updatedAt - a.updatedAt),
  update(book, idx, total) {
    const o = load(), k = id(book.url), p = o[k];
    o[k] = { title: String(book.title).slice(0, 200), url: book.url, idx, total, updatedAt: Date.now(), done: !!(p?.done || idx >= total - 2) };
    save(o); dirty.add(k); if (!timer) timer = setTimeout(() => this.flush(), 10000);       // ghi lên Firestore tối đa mỗi ~10 giây
  },
  async flush() {
    clearTimeout(timer); timer = 0; if (!uid || !dirty.size) return;
    const c = await cloud(); if (!c) return; const o = load(), keys = [...dirty]; dirty.clear();
    await Promise.all(keys.filter(k => o[k]).map(k => c.fs.setDoc(c.fs.doc(c.db, 'kinhphat_users', uid, 'books', k), o[k]).catch(() => dirty.add(k))));
  },
  async setUser(u) {                                       // gọi khi đăng nhập / đăng xuất
    const prev = uid; uid = u?.uid || null;
    if (!uid) { if (prev) { try { localStorage.removeItem(KEY); } catch {} } this.onChange(); return; }
    const c = await cloud(); if (!c) return;
    try {
      const snap = await c.fs.getDocs(c.fs.query(c.fs.collection(c.db, 'kinhphat_users', uid, 'books'), c.fs.orderBy('updatedAt', 'desc'), c.fs.limit(MAX)));
      const o = load(), remote = {}; snap.forEach(d => { remote[d.id] = d.data(); });
      for (const [k, r] of Object.entries(remote)) if (!o[k] || o[k].updatedAt < r.updatedAt) o[k] = r;      // bản mới hơn thắng
      for (const k of Object.keys(o)) if (!remote[k] || remote[k].updatedAt < o[k].updatedAt) dirty.add(k);
      save(o); await this.flush();
    } catch (e) { console.warn('Đồng bộ tiến độ lỗi', e); }
    this.onChange();
  }
};
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Progress.flush(); });
addEventListener('pagehide', () => Progress.flush());
