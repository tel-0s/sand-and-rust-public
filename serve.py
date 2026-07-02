#!/usr/bin/env python3
"""Dev server with caching disabled — module updates always load fresh.

Run with --dev (or --debug) to enable the in-game debug console (backtick
key): the game probes HEAD /__dev__ at boot and only loads js/debug.js when
this server answers. Public/static hosting never answers the probe, so the
console cannot appear in the published build.

  python3 serve.py --dev [--port 8741]
"""
import http.server
import socketserver
import sys

PORT = 8741
if '--port' in sys.argv:
    PORT = int(sys.argv[sys.argv.index('--port') + 1])
DEV = '--dev' in sys.argv or '--debug' in sys.argv


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_HEAD(self):
        if self.path == '/__dev__':
            self.send_response(204 if DEV else 404)
            self.end_headers()
            return
        super().do_HEAD()

    def log_message(self, fmt, *args):
        pass  # quiet


with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    httpd.allow_reuse_address = True
    print(f'SAND & RUST — http://localhost:{PORT} (no-cache{", DEV CONSOLE ON [`]" if DEV else ""})')
    httpd.serve_forever()
