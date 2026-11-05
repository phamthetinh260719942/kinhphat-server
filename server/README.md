# Server trung gian Thư Viện Kinh

## Cài trên Render (Web Service)
- Root Directory: `server`  ·  Build Command: `npm install`  ·  Start Command: `npm start`
- Health Check Path: `/health`
- Biến môi trường:
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (dán nguyên khóa, có `\n` cũng được)
  - `ALLOWED_ORIGIN` = `https://kinhphat.onrender.com` (nhiều domain thì cách nhau bằng dấu phẩy)
  - Tùy chọn: `ALLOW_GUESTS=false` (bắt buộc đăng nhập), `ROOM_CAPACITY=30`, `TTS_RATE_PER_MIN=60`, `ALLOW_LOCALHOST=true` (khi thử trên máy)

## HTTP
- `GET /health` -> `{ok, rooms, players, auth}`
- `GET /tts?q=<văn bản ≤200 ký tự>&lang=vi` -> audio/mpeg (có cache, giới hạn tần suất)

## WebSocket `wss://<server>/ws`
Client gửi (JSON):
- `{t:'join', room:'lib' | 'dharma:<idSách>', token?:<Firebase ID token>, name?, outfit?:'brown'|'yellow'}`
- `{t:'move', x, z, yaw}` (tối đa ~15 lần/giây)
- `{t:'act', a:'sit', seat?:số}` · `{t:'act', a:'stand'}` · `{t:'act', a:'palms'|'bow'|'lay'}`
- `{t:'ping'}` mỗi ~25 giây để giữ kết nối

Server gửi:
- `welcome {id, room, players:[{id,name,outfit,x,z,yaw,pose,seat}], cap}`
- `join {p}` · `leave {id}` · `state {ps:[[id,x,z,yaw],…]}` · `act {id,a,seat?}` · `notice {text}` · `pos {x,z}` (bị kéo về) · `error {msg}` · `pong`
- Phòng đầy (30 người) tự mở bản `#2`, `#3`… ; tên phòng thật nằm trong `welcome.room`.
