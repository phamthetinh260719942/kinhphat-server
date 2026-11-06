// Đăng ký / đăng nhập bằng TÊN + MẬT KHẨU (Firebase dùng email giả ghép từ tên, không gửi thư thật).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import * as A from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import * as fs from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
export const auth = A.getAuth(app), db = fs.getFirestore(app);
export { fs };
const USER_RE = /^[a-z0-9_.]{3,20}$/, toEmail = u => `${u}@users.kinhphat.app`;
const MSG = {
  'auth/email-already-in-use': 'Tên đăng nhập này đã có người dùng',
  'auth/invalid-credential': 'Sai tên đăng nhập hoặc mật khẩu', 'auth/wrong-password': 'Sai tên đăng nhập hoặc mật khẩu', 'auth/user-not-found': 'Sai tên đăng nhập hoặc mật khẩu',
  'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự)', 'auth/too-many-requests': 'Thử quá nhiều lần, hãy đợi một lúc',
  'auth/network-request-failed': 'Không có mạng', 'auth/operation-not-allowed': 'Chưa bật Email/Password trong Firebase Authentication'
};
const wrap = async fn => { try { return await fn(); } catch (e) { throw new Error(MSG[e.code] || e.message || 'Có lỗi xảy ra'); } };
const norm = u => String(u || '').trim().toLowerCase();
export const Auth = {
  get user() { return auth.currentUser; },
  onChange: cb => A.onAuthStateChanged(auth, cb),
  register: (username, password, display) => wrap(async () => {
    username = norm(username);
    if (!USER_RE.test(username)) throw new Error('Tên đăng nhập 3–20 ký tự: chữ thường không dấu, số, _ hoặc .');
    if (String(password).length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự');
    const name = String(display || username).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20) || username;
    const cred = await A.createUserWithEmailAndPassword(auth, toEmail(username), password);
    await A.updateProfile(cred.user, { displayName: name });
    try { await fs.setDoc(fs.doc(db, 'kinhphat_users', cred.user.uid), { username, displayName: name, createdAt: Date.now() }); } catch {}
    return cred.user;
  }),
  login: (username, password) => wrap(async () => {
    username = norm(username); if (!username || !password) throw new Error('Nhập tên đăng nhập và mật khẩu');
    return (await A.signInWithEmailAndPassword(auth, toEmail(username), password)).user;
  }),
  logout: () => A.signOut(auth)
};
