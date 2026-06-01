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
  TRUNCATE( a.DATA_FREE / 1024 / 1024, 2 ) AS free_size_mb
FROM information_schema.TABLES a
ORDER BY	( data_length + index_length ) DESC 
LIMIT 10