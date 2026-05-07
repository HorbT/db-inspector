SELECT TOP (50) OBJECT_NAME(qt.objectid, dbid) AS [SP Name]
    ,(qs.total_logical_reads + qs.total_logical_writes) / qs.execution_count AS [Avg IO]
    ,qs.execution_count AS [Execution Count]
    ,SUBSTRING(qt.[text], qs.statement_start_offset / 2 + 1, (
            CASE
                WHEN qs.statement_end_offset = - 1
                    THEN LEN(CONVERT(NVARCHAR(max), qt.[text])) * 2
                ELSE qs.statement_end_offset
                END - qs.statement_start_offset
            ) / 2) AS [Query Text]
FROM master.sys.dm_exec_query_stats AS qs WITH (NOLOCK)
CROSS APPLY master.sys.dm_exec_sql_text(qs.sql_handle) AS qt
WHERE qt.[dbid] = DB_ID()
ORDER BY [Avg IO] DESC
OPTION (RECOMPILE);