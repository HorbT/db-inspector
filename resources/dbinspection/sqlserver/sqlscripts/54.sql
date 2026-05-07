SELECT is_enabled
    ,[path]
    ,max_size
    ,max_files
FROM sys.dm_os_server_diagnostics_log_configurations WITH (NOLOCK)
OPTION (RECOMPILE);