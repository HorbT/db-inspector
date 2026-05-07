SELECT *
from (SELECT  now() 当前时间,
	CURRENT_USER() 当前用户,
	( SELECT @@server_id ) ServerID ,
	version() 数据库版本,
	( SELECT sum( TRUNCATE ( ( data_length + index_length ) / 1024 / 1024, 2 ) ) AS 'all_db_size(MB)' FROM information_schema.TABLES b ) 所有数据库大小MB,
	(select truncate(sum(total_extents*extent_size)/1024/1024,2) from  information_schema.FILES b) 所有数据文件大小MB,
	( SELECT @@datadir ) 数据文件目录,
	( SELECT @@SOCKET ) SOCKET文件位置,
	( SELECT @@log_error ) 日志文件位置,
	( SELECT @@autocommit ) 是否自动提交,
	( SELECT @@log_bin ) 是否开启Binlog) V