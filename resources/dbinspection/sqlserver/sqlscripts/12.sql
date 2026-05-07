SELECT f.[name] AS [File Name]
    ,f.physical_name AS [Physical Name]
    ,CAST((f.size / 128.0) AS DECIMAL(15, 2)) AS [Total Size in MB]
    ,CAST(f.size / 128.0 - CAST(FILEPROPERTY(f.[name], 'SpaceUsed') AS INT) / 128.0 AS DECIMAL(15, 2)) AS [Available Space In MB]
    ,[file_id]
    ,fg.[name] AS [Filegroup Name]
FROM sys.database_files AS f WITH (NOLOCK)
LEFT OUTER JOIN sys.data_spaces AS fg WITH (NOLOCK) ON f.data_space_id = fg.data_space_id
OPTION (RECOMPILE);