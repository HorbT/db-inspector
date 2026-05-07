"""
Oracle database plugin using oracledb (Python-oracledb).
Supports both thin mode (no Instant Client) and thick mode.
"""
try:
    import oracledb
    HAS_ORACLE = True
except ImportError:
    HAS_ORACLE = False

from plugins.base import BaseDBPlugin


class OraclePlugin(BaseDBPlugin):
    db_type = 'oracle'
    db_name = 'Oracle'

    def connect(self, config: dict) -> str:
        if not HAS_ORACLE:
            raise ImportError('oracledb is not installed. Run: pip install oracledb')

        try:
            # Try thin mode first (no Instant Client needed)
            try:
                oracledb.init_oracle_client()
            except Exception:
                pass  # Will use thin mode by default in newer versions

            # Set TCP connect timeout to avoid hanging on unreachable servers
            try:
                oracledb.defaults.tcp_connect_timeout = 10
            except Exception:
                pass

            host = config.get('host', 'localhost')
            port = int(config.get('port', 1521))
            service_name = config.get('database', 'ORCL')
            username = config.get('username', 'system')
            password = config.get('password', '')

            dsn = f"{host}:{port}/{service_name}"

            conn = oracledb.connect(
                user=username,
                password=password,
                dsn=dsn,
                disable_oob=True,  # avoid out-of-band breaks on Windows
            )
            version = conn.version
            conn.close()
            return f"Oracle {version}"
        except Exception as e:
            raise Exception(f"Oracle连接失败: {str(e)}")

    def execute_query(self, config: dict, sql: str, timeout: int) -> dict:
        if not HAS_ORACLE:
            raise ImportError('oracledb is not installed')

        conn = None
        cursor = None
        try:
            try:
                oracledb.defaults.tcp_connect_timeout = 10
            except Exception:
                pass

            host = config.get('host', 'localhost')
            port = int(config.get('port', 1521))
            service_name = config.get('database', 'ORCL')
            username = config.get('username', 'system')
            password = config.get('password', '')

            dsn = f"{host}:{port}/{service_name}"
            conn = oracledb.connect(user=username, password=password, dsn=dsn, disable_oob=True)

            cursor = conn.cursor()

            # Strip trailing semicolons (Oracle doesn't like them)
            sql = sql.strip().rstrip(';')

            cursor.execute(sql)

            if cursor.description:
                columns = [col[0] for col in cursor.description]
                rows = [list(row) for row in cursor.fetchall()]
                return {'columns': columns, 'rows': rows}
            else:
                return {'columns': ['affected_rows'], 'rows': [[cursor.rowcount]]}

        except Exception as e:
            raise Exception(f"Oracle SQL执行失败: {str(e)}")
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
