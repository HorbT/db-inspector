SELECT
	r.session_id,
	r.wait_type,
	r.wait_time as wait_time_ms
FROM
	sys.dm_exec_requests r
JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
WHERE
	wait_type in ('PAGEIOLATCH_SH', 'PAGEIOLATCH_EX', 'WRITELOG','IO_COMPLETION', 'ASYNC_IO_COMPLETION', 'BACKUPIO')
	AND is_user_process = 1