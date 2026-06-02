"""
Inspection engine - executes SQL scripts against databases and streams results.
"""
import os
import sys
import json
import re
import datetime
import decimal
import traceback
from typing import Any
from plugins.base import BaseDBPlugin
from core.utils import read_sql_files, ensure_directory, get_timestamp


class _JsonEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Python-specific types from database drivers."""
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        if isinstance(obj, datetime.date):
            return obj.strftime('%Y-%m-%d')
        if isinstance(obj, datetime.timedelta):
            return str(obj)
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, bytes):
            return obj.hex()
        if isinstance(obj, set):
            return list(obj)
        return super().default(obj)


def _to_json_safe(val):
    """Recursively convert a value to JSON-safe types."""
    if val is None:
        return None
    if isinstance(val, datetime.datetime):
        return val.strftime('%Y-%m-%d %H:%M:%S')
    if isinstance(val, datetime.date):
        return val.strftime('%Y-%m-%d')
    if isinstance(val, datetime.timedelta):
        return str(val)
    if isinstance(val, decimal.Decimal):
        return float(val)
    if isinstance(val, bytes):
        return val.hex()
    if isinstance(val, set):
        return list(val)
    if isinstance(val, (list, tuple)):
        return [_to_json_safe(v) for v in val]
    if isinstance(val, dict):
        return {k: _to_json_safe(v) for k, v in val.items()}
    return val


def _emit_debug(msg: str):
    """Write a debug progress line to stderr for real-time streaming to Electron."""
    print(f"[DBG] {msg}", file=sys.stderr, flush=True)


def _emit_result(payload: dict):
    """Write a single SQL result as JSON to stderr for real-time streaming."""
    print(f"[RSLT] {json.dumps(payload, ensure_ascii=False, cls=_JsonEncoder)}", file=sys.stderr, flush=True)


def _emit_done(payload: dict):
    """Write inspection completion status to stderr."""
    print(f"[DONE] {json.dumps(payload, ensure_ascii=False, cls=_JsonEncoder)}", file=sys.stderr, flush=True)


class InspectorEngine:
    def __init__(self, plugins: dict[str, BaseDBPlugin]):
        self.plugins = plugins

    def execute(
        self,
        plugin: BaseDBPlugin,
        connection_config: dict,
        description: str,
        sql_scripts_dir: str,
        report_template_path: str,
        report_template_libs_dir: str,
        result_path: str,
        query_timeout: int = 300,
        debug: bool = False,
    ) -> dict:
        """
        Execute a full inspection for a single database connection.
        Results are streamed in real-time via stderr ([RSLT]/[DONE] events).
        Returns metadata dict (no HTML generation — that's done on-demand from .db data).
        """
        results = []
        error_count = 0

        # Validate SQL scripts directory
        if not os.path.exists(sql_scripts_dir):
            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': False,
                'error': f'SQL脚本目录不存在: {sql_scripts_dir}',
                'results': [],
                'completedAt': get_timestamp(),
            }

        # Read SQL files
        sql_files = read_sql_files(sql_scripts_dir)
        if not sql_files:
            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': False,
                'error': f'在 {sql_scripts_dir} 中未找到SQL文件',
                'results': [],
                'completedAt': get_timestamp(),
            }

        if debug:
            _emit_debug(f'巡检开始 | 数据库类型: {plugin.db_type} | 脚本目录: {sql_scripts_dir}')
            _emit_debug(f'共找到 {len(sql_files)} 个SQL脚本文件')

        ensure_directory(result_path)

        try:
            # Connect to database
            server_info = plugin.connect(connection_config)
            if debug:
                _emit_debug(f'数据库连接成功 | 服务器信息: {server_info}')

            # Execute each SQL file
            total_scripts = len(sql_files)
            for idx, (file_name, sql_content) in enumerate(sql_files, 1):
                if not sql_content.strip():
                    if debug:
                        _emit_debug(f'[{idx}/{total_scripts}] 跳过空脚本: {file_name}')
                    continue

                # Extract file number from filename (e.g., "0.sql" → 0, "13_chart.sql" → 13)
                file_num_match = re.search(r'(\d+)', file_name)
                file_num = int(file_num_match.group(1)) if file_num_match else idx

                try:
                    if debug:
                        sql_preview = sql_content[:200].replace('\n', ' ')
                        _emit_debug(f'[{idx}/{total_scripts}] 执行: {file_name} | SQL: {sql_preview}...')

                    query_result = plugin.execute_query(
                        connection_config,
                        sql_content,
                        query_timeout,
                    )
                    columns = query_result.get('columns', [])
                    rows = query_result.get('rows', [])
                    row_count = len(rows)

                    # Convert rows to JSON-safe types
                    safe_rows = [_to_json_safe(row) for row in rows] if rows else []

                    results.append({
                        'fileName': file_name,
                        'columns': columns,
                        'rows': rows,
                    })

                    # Emit real-time result event (with JSON-safe data)
                    _emit_result({
                        'fileNum': file_num,
                        'fileName': file_name,
                        'section': '',
                        'columns': [str(c) for c in columns],
                        'rows': safe_rows,
                        'rowCount': row_count,
                    })

                    if debug:
                        _emit_debug(f'[{idx}/{total_scripts}] 成功: {file_name} | 列数: {len(columns)} | 行数: {row_count}')

                except Exception as e:
                    error_count += 1
                    results.append({
                        'fileName': file_name,
                        'error': str(e),
                    })

                    # Emit real-time error event
                    _emit_result({
                        'fileNum': file_num,
                        'fileName': file_name,
                        'section': '',
                        'error': str(e),
                    })

                    if debug:
                        _emit_debug(f'[{idx}/{total_scripts}] 失败: {file_name} | 错误: {str(e)}')

            # Disconnect
            try:
                plugin.disconnect(connection_config)
            except Exception:
                pass

            # Emit completion event
            _emit_done({
                'status': 'completed',
                'total': total_scripts,
                'errorCount': error_count,
            })

            if debug:
                _emit_debug(f'巡检结束 | 共执行 {len(results)} 个查询 | 错误数: {error_count}')

            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': True,
                'results': results,
                'completedAt': get_timestamp(),
                'serverInfo': server_info,
                'total': total_scripts,
                'errorCount': error_count,
            }

        except Exception as e:
            _emit_done({
                'status': 'failed',
                'error': str(e),
            })

            if debug:
                _emit_debug(f'巡检异常: {str(e)}')
            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc(),
                'results': results,
                'completedAt': get_timestamp(),
            }