"""
HTML report generator using DB-specific templates.
"""
import os
import re
import datetime


class ReportGenerator:
    def __init__(self, template_path: str):
        self.template_path = template_path
        self.template_content = self._load_template()

    def _load_template(self) -> str:
        """Load the HTML template file."""
        try:
            if os.path.exists(self.template_path):
                with open(self.template_path, 'r', encoding='utf-8') as f:
                    return f.read()
        except Exception:
            pass
        return self._get_default_template()

    def _get_default_template(self) -> str:
        """Return a default template as fallback."""
        return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <title>数据库巡检报告</title>
    <style>
        body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background-color: #3498db; color: white; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        .error { color: #e74c3c; font-weight: bold; }
        .result-section { margin-bottom: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
</style></head>
<body>
    <h1>数据库巡检报告</h1>
    <p>生成时间: {{generated_time}}</p>
    {{results}}
</body></html>"""

    def _extract_file_number(self, file_name: str) -> int:
        """Extract numeric prefix from SQL file name."""
        match = re.search(r'(\d+)', file_name)
        if match:
            return int(match.group(1))
        return -1

    def _result_to_html(self, file_name: str, result: dict) -> str:
        """Convert a single query result to HTML."""
        parts = ['<div class="result-section">']

        if result.get('error'):
            parts.append(f'<p class="error">错误: {result["error"]} (来源: {file_name})</p>')
        elif result.get('columns') and result.get('rows') is not None:
            columns = result['columns']
            rows = result['rows']

            parts.append('<table>')
            # Header
            parts.append('<tr>')
            for col in columns:
                parts.append(f'<th>{col}</th>')
            parts.append('</tr>')
            # Rows
            if rows:
                for row in rows:
                    parts.append('<tr>')
                    for value in row:
                        if value is None:
                            parts.append('<td></td>')
                        elif isinstance(value, datetime.datetime):
                            parts.append(f'<td>{value.strftime("%Y-%m-%d %H:%M:%S")}</td>')
                        else:
                            parts.append(f'<td>{value}</td>')
                    parts.append('</tr>')
            else:
                parts.append(f'<tr><td colspan="{len(columns)}" style="text-align:center">无数据</td></tr>')
            parts.append('</table>')
        else:
            parts.append(f'<p>({file_name}) 无表格数据</p>')

        parts.append('</div>')
        return '\n'.join(parts)

    def generate(
        self,
        description: str,
        results: list,
        output_path: str,
        server_info: str = '',
    ) -> tuple:
        """
        Generate HTML report.
        Returns (success: bool, message: str).
        """
        try:
            html = self.template_content

            # Build result map by file number
            result_map = {}
            all_results_html = []

            for item in results:
                file_name = item.get('fileName', '')
                file_num = self._extract_file_number(file_name)
                result_html = self._result_to_html(file_name, item)

                if file_num >= 0:
                    result_map[file_num] = result_html
                all_results_html.append(result_html)

            # Replace placeholders in template
            generated_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            html = html.replace('{{generated_time}}', generated_time)
            html = html.replace('{{description}}', description)
            html = html.replace('{{server_info}}', server_info)

            # Replace numbered placeholders (support both {{ result_N }} and { result_N })
            for num, content in result_map.items():
                # Double-brace format: {{ result_N }}
                db_placeholder = '{{ result_' + str(num) + ' }}'
                html = html.replace(db_placeholder, content)
                # Single-brace format: { result_N }
                sb_placeholder = '{ result_' + str(num) + ' }'
                html = html.replace(sb_placeholder, content)

            # Clear unmatched placeholders (both formats)
            html = re.sub(r'\{\{\s*result_\d+\s*\}\}', '', html)
            html = re.sub(r'\{\s*result_\d+\s*\}', '', html)

            # If no placeholders were replaced, insert all results at {{results}}
            if '{{results}}' in html:
                html = html.replace('{{results}}', '\n'.join(all_results_html))

            # Ensure output directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html)

            return True, f'报告已保存至: {output_path}'
        except Exception as e:
            return False, f'生成报告失败: {str(e)}'
