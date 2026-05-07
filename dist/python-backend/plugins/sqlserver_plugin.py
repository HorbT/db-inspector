"""
SQL Server database plugin using pyodbc.
"""
try:
    import pyodbc
    HAS_PYODBC = True
except ImportError:
    HAS_PYODBC = False

from plugins.base import BaseDBPlugin


class SQLServerPlugin(BaseDBPlugin):
    db_type = 'sqlserver'
    db_name = 'SQL Server'

    def _build_connection_string(self, config: dict) -> str:
        host = config.get('host', 'localhost')
        port = int(config.get('port', 1433))
        database = config.get('database', 'master')
        username = config.get('username', 'sa')
        password = config.get('password', '')

        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={host},{port};"
            f"DATABASE={database};"
            f"UID={username};"
            f"PWD={password};"
            f"TrustServerCertificate=yes;"
            f"Encrypt=yes;"
        )
        return conn_str

    def connect(self, config: dict) -> str:
        if not HAS_PYODBC:
            raise ImportError('pyodbc is not installed. Run: pip install pyodbc')

        try:
            conn_str = self._build_connection_string(config)
            conn = pyodbc.connect(conn_str, timeout=10)
            cursor = conn.cursor()
            cursor.execute("SELECT @@VERSION")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            return f"SQL Server {version.split(' - ')[0] if version else 'unknown'}"
        except pyodbc.Error as e:
            raise Exception(f"SQL Server连接失败: {str(e)}")
        except Exception as e:
            raise Exception(f"连接错误: {str(e)}")

    def execute_query(self, config: dict, sql: str, timeout: int) -> dict:
        if not HAS_PYODBC:
            raise ImportError('pyodbc is not installed')

        conn = None
        cursor = None
        try:
            conn_str = self._build_connection_string(config)
            conn = pyodbc.connect(conn_str, timeout=timeout)
            cursor = conn.cursor()

            # Strip trailing semicolons
            sql = sql.strip().rstrip(';')

            cursor.execute(sql)

            if cursor.description:
                columns = [col[0] for col in cursor.description]
                rows = [list(row) for row in cursor.fetchall()]
                return {'columns': columns, 'rows': rows}
            else:
                return {'columns': ['affected_rows'], 'rows': [[cursor.rowcount]]}

        except pyodbc.Error as e:
            raise Exception(f"SQL Server SQL执行失败: {str(e)}")
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def disconnect(self, config: dict):
        pass
