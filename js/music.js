// Nhạc đệm: liệt kê file trong music/list.json  ->  [{"name":"Tên","file":"music/abc.mp3"}]
const a = new Audio(); a.preload = 'none';
let list = [], i = 0, vol = 0.4, ducked = false;
const apply = () => a.volume = vol * (ducked ? 0.35 : 1);
const load = k => { i = (k + list.length) % list.length; a.src = list[i].file; music.onChange(); };
export const music = {
  onChange() {},
  get name() { return list.length ? list[i].name : 'Chưa có nhạc'; },
  get playing() { return !a.paused; },
  async init() { try { list = await (await fetch('music/list.json')).json(); if (list.length) load(0); } catch {} apply(); },
  toggle() { if (!list.length) return false; a.paused ? a.play() : a.pause(); return true; },
  next() { if (!list.length) return; load(i + 1); a.play(); },
  setVolume(v) { vol = v; apply(); },
  duck(on) { ducked = on; apply(); }
};
a.onended = () => music.next(); a.onplay = a.onpause = () => music.onChange();
