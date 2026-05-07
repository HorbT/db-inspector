SELECT
	concat(table_schema,'.',table_name)AS table_name,
	TRUNCATE( ( data_length + index_length ) / 1024 / 1024 / 1024, 2 ) AS all_size_gb
FROM information_schema.TABLES a
ORDER BY	( data_length + index_length ) DESC
LIMIT 10