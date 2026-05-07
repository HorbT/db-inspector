SELECT is_online
    ,[status]
    ,COUNT(*) AS [count]
FROM sys.dm_os_schedulers
WHERE scheduler_id < 255
GROUP BY is_online
    ,[status];