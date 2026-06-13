#!/usr/bin/env python3
"""Dev server with caching disabled — module updates always load fresh."""
import http.server
import socketserver

PORT = 8741

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # quiet

with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    httpd.allow_reuse_address = True
    print(f'SAND & RUST — http://localhost:{PORT} (no-cache)')
    httpd.serve_forever()
