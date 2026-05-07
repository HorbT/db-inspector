"""
TiDB database plugin. TiDB is MySQL-compatible, so this wraps MySQL plugin.
"""
try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
    HAS_MYSQL = True
except ImportError:
    HAS_MYSQL = False

from plugins.base import BaseDBPlugin


class TiDBPlugin(BaseDBPlugin):
    db_type = 'tidb'
    db_name = 'TiDB'

    def connect(self, config: dict) -> str:
        if not HAS_MYSQL:
            raise ImportError('mysql-connector-python is not installed. Run: pip install mysql-connector-python')

        try:
            conn = mysql.connector.connect(
                host=config.get('host', 'localhost'),
                port=int(config.get('port', 4000)),
                user=config.get('username', 'root'),
                password=config.get('password', ''),
                database=config.get('database', 'test'),
                connect_timeout=10,
                charset='utf8mb4',
            )
            info = conn.get_server_info()
            conn.close()
            # TiDB version info includes TiDB version string
            return f"TiDB {info}"
        except MySQLError as e:
            raise Exception(f"TiDB连接失败: {str(e)}")
        except Exception as e:
            raise Exception(f"连接错误: {str(e)}")

    def execute_query(self, config: dict, sql: str, timeout: int) -> dict:
        if not HAS_MYSQL:
            raise ImportError('mysql-connector-python is not installed')

        conn = None
        cursor = None
        try:
            conn = mysql.connector.connect(
                host=config.get('host', 'localhost'),
                port=int(config.get('port', 4000)),
                user=config.get('username', 'root'),
                password=config.get('password', ''),
                database=config.get('database', 'test'),
                connect_timeout=10,
                charset='utf8mb4',
            )
            conn.call_timeout = timeout * 1000

            cursor = conn.cursor(dictionary=True)

            # Set max execution time (TiDB supports this MySQL syntax)
            try:
                cursor.execute(f"SET max_execution_time = {timeout * 1000}")
            except Exception:
                pass

            cursor.execute(sql)

            if cursor.with_rows:
                columns = [col[0] for col in cursor.description]
                rows = [list(row.values()) for row in cursor.fetchall()]
                return {'columns': columns, 'rows': rows}
            else:
                return {'columns': ['affected_rows'], 'rows': [[cursor.rowcount]]}

        except MySQLError as e:
            if hasattr(e, 'errno') and e.errno == 3024:
                raise Exception(f"SQL执行超时 (超过 {timeout} 秒)")
            raise Exception(f"TiDB SQL执行失败: {str(e)}")
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
