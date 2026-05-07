"""
JSON-RPC bridge via stdin/stdout communication with Electron.
"""
import sys
import json
import traceback
from typing import Callable, Any


class Bridge:
    def __init__(self):
        self.handlers: dict[str, Callable] = {}

    def register(self, method: str, handler: Callable):
        """Register a JSON-RPC method handler."""
        self.handlers[method] = handler

    def log(self, message: str):
        """Log a message to stderr (goes to Electron's stderr handler)."""
        print(f"[PythonBackend] {message}", file=sys.stderr, flush=True)

    def _write_response(self, response: dict):
        """Write a JSON-RPC response to stdout."""
        line = json.dumps(response, ensure_ascii=False, default=str)
        sys.stdout.write(line + '\n')
        sys.stdout.flush()

    def _handle_request(self, request: dict):
        """Process a single JSON-RPC request."""
        req_id = request.get('id', 0)
        method = request.get('method', '')
        params = request.get('params', {})

        handler = self.handlers.get(method)
        if not handler:
            self._write_response({
                'jsonrpc': '2.0',
                'id': req_id,
                'error': {'code': -32601, 'message': f'Method not found: {method}'},
            })
            return

        try:
            result = handler(params)
            self._write_response({
                'jsonrpc': '2.0',
                'id': req_id,
                'result': result,
            })
        except Exception as e:
            self.log(f"Error in handler {method}: {traceback.format_exc()}")
            self._write_response({
                'jsonrpc': '2.0',
                'id': req_id,
                'error': {'code': -32000, 'message': str(e), 'data': traceback.format_exc()},
            })

    def run(self):
        """Main loop: read JSON-RPC requests from stdin line by line."""
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                request = json.loads(line)
                self._handle_request(request)
            except json.JSONDecodeError as e:
                self.log(f"Invalid JSON input: {e}")
            except Exception as e:
                self.log(f"Unexpected error: {traceback.format_exc()}")
