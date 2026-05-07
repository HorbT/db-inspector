"""
Inspection engine - executes SQL scripts against databases and generates reports.
"""
import os
import sys
import traceback
from typing import Any
from plugins.base import BaseDBPlugin
from core.report_generator import ReportGenerator
from core.utils import read_sql_files, ensure_directory, get_timestamp


def _emit_debug(msg: str):
    """Write a debug progress line to stderr for real-time streaming to Electron."""
    print(f"[DBG] {msg}", file=sys.stderr, flush=True)


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
        Returns inspection result dict.
        """
        results = []
        error_occurred = False
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

        # Ensure result directory exists
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

                try:
                    if debug:
                        sql_preview = sql_content[:200].replace('\n', ' ')
                        _emit_debug(f'[{idx}/{total_scripts}] 执行: {file_name} | SQL: {sql_preview}...')

                    query_result = plugin.execute_query(
                        connection_config,
                        sql_content,
                        query_timeout,
                    )
                    results.append({
                        'fileName': file_name,
                        'columns': query_result.get('columns', []),
                        'rows': query_result.get('rows', []),
                    })

                    if debug:
                        col_count = len(query_result.get('columns', []))
                        row_count = len(query_result.get('rows', []))
                        _emit_debug(f'[{idx}/{total_scripts}] 成功: {file_name} | 列数: {col_count} | 行数: {row_count}')

                except Exception as e:
                    error_occurred = True
                    error_count += 1
                    results.append({
                        'fileName': file_name,
                        'error': str(e),
                    })
                    if debug:
                        _emit_debug(f'[{idx}/{total_scripts}] 失败: {file_name} | 错误: {str(e)}')

            # Disconnect
            try:
                plugin.disconnect(connection_config)
            except Exception:
                pass

            if debug:
                _emit_debug(f'巡检结束 | 共执行 {len(results)} 个查询 | 错误数: {error_count}')

            # Generate report
            report_generator = ReportGenerator(report_template_path)
            report_filename = f"{description}_{get_timestamp()}.html"
            report_path = os.path.join(result_path, report_filename)

            success, msg = report_generator.generate(
                description=description,
                results=results,
                output_path=report_path,
                server_info=server_info,
            )

            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': success,
                'reportPath': report_path if success else None,
                'error': None if success else msg,
                'results': results,
                'completedAt': get_timestamp(),
            }

        except Exception as e:
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
