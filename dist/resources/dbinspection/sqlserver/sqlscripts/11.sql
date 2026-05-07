SELECT DB_NAME([database_id]) AS [Database Name]
    ,[file_id]
    ,[name]
    ,physical_name
    ,type_desc
    ,state_desc
    ,is_percent_growth
    ,growth
    ,CONVERT(BIGINT, growth / 128.0) AS [Growth in MB]
    ,CONVERT(BIGINT, size / 128.0) AS [Total Size in MB]
FROM sys.master_files WITH (NOLOCK)
WHERE [database_id] > 4
    AND [database_id] <> 32767
    OR [database_id] = 2
ORDER BY DB_NAME([database_id])
OPTION (RECOMPILE);