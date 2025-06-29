#!/usr/bin/env python3
"""
Simple HTTP Server with correct MIME types for the Interactive CNN Trainer
This server handles MIME types properly to avoid module loading issues.
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler with proper MIME types"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def guess_type(self, path):
        """Override to provide correct MIME types"""
        mimetype, encoding = super().guess_type(path)

        # Handle specific file extensions
        if path.endswith('.tsx') or path.endswith('.ts'):
            return 'application/javascript', encoding
        elif path.endswith('.jsx') or path.endswith('.js'):
            return 'application/javascript', encoding
        elif path.endswith('.json'):
            return 'application/json', encoding
        elif path.endswith('.css'):
            return 'text/css', encoding
        elif path.endswith('.html'):
            return 'text/html', encoding
        elif path.endswith('.svg'):
            return 'image/svg+xml', encoding
        elif path.endswith('.ico'):
            return 'image/x-icon', encoding

        return mimetype, encoding

    def do_GET(self):
        """Handle GET requests"""
        # Parse the URL
        parsed_path = urlparse(self.path)

        # Handle root path - redirect to standalone version
        if parsed_path.path == '/':
            self.send_response(302)
            self.send_header('Location', '/index-standalone.html')
            self.end_headers()
            return

        # Handle favicon requests
        if parsed_path.path == '/favicon.ico':
            self.send_response(404)
            self.end_headers()
            return

        # For all other requests, use the default handler
        super().do_GET()

    def log_message(self, format, *args):
        """Override to provide cleaner logging"""
        print(f"[{self.address_string()}] {format % args}")

def find_free_port(start_port=8080):
    """Find a free port starting from start_port"""
    import socket

    port = start_port
    while port < start_port + 100:  # Try up to 100 ports
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            port += 1

    raise RuntimeError("Could not find a free port")

def main():
    """Main function to start the server"""
    try:
        port = find_free_port(8080)

        print("🚀 Interactive CNN Trainer - Python HTTP Server")
        print("=" * 50)
        print(f"🌐 Starting server on port {port}...")
        print(f"   Open your browser and navigate to:")
        print(f"   ")
        print(f"   http://localhost:{port}")
        print(f"   ")
        print(f"   The server will automatically redirect to the standalone version")
        print(f"   Press Ctrl+C to stop the server")
        print("")

        # Change to the script directory
        os.chdir(os.path.dirname(os.path.abspath(__file__)))

        # Start the server
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
