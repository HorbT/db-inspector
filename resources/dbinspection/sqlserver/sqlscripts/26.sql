SELECT DB_NAME(database_id) AS [DBNAME]
    ,file_id
    ,io_stall
    ,io_pending_ms_ticks
    ,scheduler_address
FROM sys.dm_io_virtual_file_stats(NULL, NULL) iovfs
    ,sys.dm_io_pending_io_requests AS iopior
WHERE iovfs.file_handle = iopior.io_handle