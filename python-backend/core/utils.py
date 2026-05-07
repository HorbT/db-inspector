"""
Utility functions for the Python backend.
"""
import os
import re
import datetime


def read_sql_files(scripts_dir: str) -> list:
    """
    Read all numbered SQL files from a directory.
    Returns list of (filename, content) sorted by numeric prefix.
    """
    if not os.path.exists(scripts_dir):
        return []

    sql_files = []
    for filename in os.listdir(scripts_dir):
        if not filename.endswith('.sql'):
            continue
        file_path = os.path.join(scripts_dir, filename)
        if not os.path.isfile(file_path):
            continue

        # Extract number for sorting
        match = re.search(r'(\d+)', filename)
        sort_key = int(match.group(1)) if match else float('inf')

        # Read file content
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='gbk') as f:
                content = f.read().strip()

        if content:
            sql_files.append((sort_key, filename, content))

    # Sort by numeric key and return (filename, content)
    sql_files.sort(key=lambda x: x[0])
    return [(f[1], f[2]) for f in sql_files]


def ensure_directory(path: str) -> bool:
    """Ensure a directory exists, creating it if necessary."""
    if not os.path.exists(path):
        try:
            os.makedirs(path, exist_ok=True)
        except Exception:
            return False
    return True


def get_timestamp() -> str:
    """Get current timestamp string for file naming."""
    return datetime.datetime.now().strftime("%Y%m%d%H%M%S")
