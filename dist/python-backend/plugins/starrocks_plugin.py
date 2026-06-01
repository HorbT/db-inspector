"""
StarRocks database plugin using mysql-connector-python.
StarRocks uses MySQL-compatible protocol on FE port 9030.
"""
try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
    HAS_MYSQL = True
except ImportError:
    HAS_MYSQL = False

from plugins.base import BaseDBPlugin


class StarRocksPlugin(BaseDBPlugin):
    db_type = 'starrocks'
    db_name = 'StarRocks'

    def connect(self, config: dict) -> str:
        if not HAS_MYSQL:
            raise ImportError('mysql-connector-python is not installed. Run: pip install mysql-connector-python')

        try:
            conn = mysql.connector.connect(
                host=config.get('host', 'localhost'),
                port=int(config.get('port', 9030)),
                user=config.get('username', 'root'),
                password=config.get('password', ''),
                database=config.get('database', ''),
                connect_timeout=10,
                charset='utf8mb4',
            )
            info = conn.get_server_info()
            conn.close()
            return f"StarRocks {info}"
        except MySQLError as e:
            raise Exception(f"StarRocks连接失败: {str(e)}")
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
                port=int(config.get('port', 9030)),
                user=config.get('username', 'root'),
                password=config.get('password', ''),
                database=config.get('database', ''),
                connect_timeout=10,
                charset='utf8mb4',
            )
            conn.call_timeout = timeout * 1000

            cursor = conn.cursor(dictionary=True)

            # Set max execution time
            try:
                cursor.execute(f"SET query_timeout = {timeout}")
            except Exception:
                pass

            # Handle multi-statement SQL (separate by semicolons)
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            if not statements:
                statements = [sql.strip()]

            # Execute each statement, return results from the last one that returns rows
            all_columns = []
            all_rows = []
            for stmt in statements:
                try:
                    cursor.execute(stmt)
                except MySQLError as e:
                    # Some statements might fail on StarRocks (e.g., 'status' is not a SQL command)
                    # Try skipping non-SELECT statements that fail
                    if 'select' in stmt.lower() or 'show' in stmt.lower():
                        raise
                    continue

                if cursor.with_rows:
                    all_columns = [col[0] for col in cursor.description] if cursor.description else []
                    row_results = [list(row.values()) for row in cursor.fetchall()]
                    all_rows.extend(row_results)

            if all_columns:
                return {'columns': all_columns, 'rows': all_rows}
            elif cursor.with_rows:
                columns = [col[0] for col in cursor.description] if cursor.description else ['result']
                rows = [list(row.values()) for row in cursor.fetchall()]
                return {'columns': columns, 'rows': rows}
            else:
                return {'columns': ['result'], 'rows': [[f'Affected rows: {cursor.rowcount}']]}

        except MySQLError as e:
            if hasattr(e, 'errno') and e.errno == 3024:
                raise Exception(f"SQL执行超时 (超过 {timeout} 秒)")
            raise Exception(f"StarRocks SQL执行失败: {str(e)}")
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
        pass  # Connection is closed after each query in execute_query