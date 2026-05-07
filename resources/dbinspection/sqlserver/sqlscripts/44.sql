SELECT 
login_name AS '登录名',
status AS '登录状态',
login_time AS '登录时间',
host_name AS '主机名',
program_name AS '使用的程序'
FROM sys.dm_exec_sessions;