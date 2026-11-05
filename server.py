# Chạy thử trên máy: python server.py -> http://localhost:8000  (giả lập rewrite /b/* của Render)
import http.server, urllib.request
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(s):
        if s.path.startswith('/b/'):
            try:
                req = urllib.request.Request('https://budsas.net' + s.path[2:], headers={'User-Agent': 'Mozilla/5.0'})
                r = urllib.request.urlopen(req); d = r.read()
                s.send_response(200); s.send_header('Content-Type', r.headers.get('Content-Type', 'text/html')); s.end_headers(); s.wfile.write(d)
            except Exception as e: s.send_error(502, str(e))
        else: super().do_GET()
http.server.ThreadingHTTPServer(('', 8000), H).serve_forever()
