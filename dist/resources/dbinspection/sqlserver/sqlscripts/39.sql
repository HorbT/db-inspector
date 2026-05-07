SELECT TOP 100 usecounts, objtype, p.size_in_bytes,[sql].[text]
FROM sys.dm_exec_cached_plans p OUTER APPLY sys.dm_exec_sql_text (p.plan_handle) sql
ORDER BY usecounts,p.size_in_bytes  desc