# Thư Viện Kinh (web tĩnh)
Trang tĩnh trên Render (Static Site, Publish Directory `.`). Server riêng nằm ở repo khác (`kinhphat-server`).

- `index.html` – trang chính, nạp `js/main.js`
- `js/` – logic: `data.js` (lấy và phân tích budsas.net), `tts.js` (giọng đọc), `music.js` (nhạc nền), `main.js` (điều phối, chọn giao diện bằng dòng import)
- `ui/ui3d.js` + `ui3d.css` – thư viện 3D (kệ sách, tượng Phật); `ui/dharma.js` + `dharma.css` – cảnh Nghe pháp; `ui/ui2d.js` + `ui2d.css` – giao diện 2D và màn hình đọc bằng mắt
- `music/list.json` – danh sách nhạc nền (file mp3 để ở thư mục gốc, ví dụ `1.mp3`)
- `render.yaml` – rewrite `/b/*` -> `https://budsas.net/*` (nếu tạo Static Site bằng tay thì thêm rule này ở Redirects/Rewrites, Action = Rewrite)
- `server.py` – chạy thử trên máy: `python server.py` rồi mở http://localhost:8000

## Tài khoản và lưu sách (Firebase)
- `js/config.js`: firebaseConfig (công khai) và SERVER_URL. `js/auth.js`: đăng ký/đăng nhập bằng tên + mật khẩu. `js/progress.js`: tiến độ đọc. `ui/account.js` + `account.css`: nút 👤 và danh sách.
- `firestore.rules`: dán vào Firebase Console > Firestore Database > Rules > Publish (dữ liệu nằm trong collection riêng `kinhphat_users`).
