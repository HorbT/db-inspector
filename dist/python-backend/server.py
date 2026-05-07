"""
DB Inspector - Python JSON-RPC Backend Server
Communicates with Electron main process via stdin/stdout JSON-RPC protocol.
"""
import sys
import json
import traceback
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.bridge import Bridge
from core.inspector import InspectorEngine
from plugins.mysql_plugin import MySQLPlugin
from plugins.oracle_plugin import OraclePlugin
from plugins.sqlserver_plugin import SQLServerPlugin
from plugins.tidb_plugin import TiDBPlugin


class Server:
    def __init__(self):
        self.bridge = Bridge()
        self.plugins = {}
        self.inspector = None
        self._register_plugins()
        self._register_methods()

    def _register_plugins(self):
        """Register all database plugins."""
        plugin_classes = {
            'mysql': MySQLPlugin,
            'oracle': OraclePlugin,
            'sqlserver': SQLServerPlugin,
            'tidb': TiDBPlugin,
        }
        for db_type, plugin_cls in plugin_classes.items():
            try:
                self.plugins[db_type] = plugin_cls()
                self.bridge.log(f"Plugin loaded: {db_type}")
            except Exception as e:
                self.bridge.log(f"Failed to load plugin {db_type}: {e}")

        self.inspector = InspectorEngine(self.plugins)

    def _register_methods(self):
        """Register all JSON-RPC methods."""
        self.bridge.register('ping', self._handle_ping)
        self.bridge.register('connection.test', self._handle_connection_test)
        self.bridge.register('inspection.execute', self._handle_inspection_execute)

    def _handle_ping(self, params):
        return {'pong': True, 'plugins': list(self.plugins.keys())}

    def _handle_connection_test(self, params):
        """Test a database connection."""
        db_type = params.get('dbType', '')
        plugin = self.plugins.get(db_type)
        if not plugin:
            return {'success': False, 'message': f'不支持的数据库类型: {db_type}'}

        try:
            config = {
                'host': params.get('host', ''),
                'port': int(params.get('port', 0)),
                'username': params.get('username', ''),
                'password': params.get('password', ''),
                'database': params.get('database', ''),
            }
            info = plugin.connect(config)
            plugin.disconnect(config)
            return {
                'success': True,
                'message': '连接成功',
                'serverInfo': info,
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'连接失败: {str(e)}',
                'error': traceback.format_exc(),
            }

    def _handle_inspection_execute(self, params):
        """Execute a full inspection on a database connection."""
        db_type = params.get('dbType', '')
        plugin = self.plugins.get(db_type)
        if not plugin:
            return {
                'success': False,
                'error': f'不支持的数据库类型: {db_type}',
                'results': [],
            }

        try:
            result = self.inspector.execute(
                plugin=plugin,
                connection_config={
                    'host': params.get('host', ''),
                    'port': int(params.get('port', 0)),
                    'username': params.get('username', ''),
                    'password': params.get('password', ''),
                    'database': params.get('database', ''),
                },
                description=params.get('description', 'unknown'),
                sql_scripts_dir=params.get('sqlScriptsDir', ''),
                report_template_path=params.get('reportTemplatePath', ''),
                report_template_libs_dir=params.get('reportTemplateLibsDir', ''),
                result_path=params.get('resultPath', ''),
                query_timeout=int(params.get('queryTimeout', 300)),
                debug=params.get('debug', False),
            )
            return result
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc(),
                'results': [],
                'connectionId': params.get('connectionId', ''),
                'description': params.get('description', ''),
                'dbType': db_type,
                'completedAt': '',
            }

    def run(self):
        """Start the server main loop."""
        self.bridge.log("DB Inspector Python Backend started")
        self.bridge.run()


if __name__ == '__main__':
    server = Server()
    server.run()
