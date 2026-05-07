"""
Abstract base class for database plugins.
Each DB type implements this interface.
"""
from abc import ABC, abstractmethod
from typing import Any


class BaseDBPlugin(ABC):
    """Abstract base class for all database plugins."""

    db_type: str = 'base'
    db_name: str = 'Base'

    @abstractmethod
    def connect(self, config: dict) -> str:
        """
        Establish a database connection.
        Args:
            config: dict with keys: host, port, username, password, database
        Returns:
            Server version/info string
        Raises:
            Exception on connection failure
        """
        ...

    @abstractmethod
    def execute_query(
        self,
        config: dict,
        sql: str,
        timeout: int,
    ) -> dict:
        """
        Execute a SQL query and return results.
        Args:
            config: Connection configuration dict
            sql: SQL statement to execute
            timeout: Query timeout in seconds
        Returns:
            dict with 'columns' (list of str) and 'rows' (list of lists)
        Raises:
            Exception on execution failure
        """
        ...

    @abstractmethod
    def disconnect(self, config: dict):
        """
        Close database connection.
        Args:
            config: Connection configuration dict
        """
        ...
