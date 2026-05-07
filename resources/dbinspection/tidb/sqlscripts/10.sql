SELECT
	table_schema AS db_name,
	table_name AS table_name,
	a.TABLE_TYPE,
	a.`ENGINE`,
	a.CREATE_TIME,
	a.UPDATE_TIME,
	a.TABLE_COLLATION,
	table_rows AS table_rows,
	TRUNCATE(a.DATA_LENGTH / 1024 / 1024, 2 ) AS tb_size_mb,
	TRUNCATE( index_length / 1024 / 1024, 2 ) AS index_size_mb,
	TRUNCATE( ( data_length + index_length ) / 1024 / 1024, 2 ) AS all_size_mb,
  TRUNCATE( a.DATA_FREE / 1024 / 1024, 2 ) AS free_size_mb,
  truncate(f.filesize_M,2) AS disk_size_mb
FROM information_schema.TABLES a
left outer join
    (select substring(b.file_name,3,locate('/',b.file_name,3)-3) as db_name,
			substring(b.file_name,locate('/',b.file_name,3)+1,(LENGTH(b.file_name)-locate('/',b.file_name,3)-4)) as tb_name,
			b.file_name,
			(total_extents*extent_size)/1024/1024 filesize_M
			from  information_schema.FILES b
			order by filesize_M desc limit 20 ) f
on ( a.TABLE_SCHEMA= f.db_name and a.TABLE_NAME=f.tb_name )
where a.DATA_LENGTH> 0
ORDER BY	( data_length + index_length ) DESC
LIMIT 10