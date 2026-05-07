SELECT
	USER() user, -- USER()、 SYSTEM_USER()、 SESSION_USER()
	version() Server_version,
	( SELECT sum( TRUNCATE ( ( data_length + index_length ) / 1024 / 1024 / 1024, 2 ) ) AS 'all_db_size(GB)' FROM information_schema.TABLES b ) all_db_size_GB,
	( SELECT @@datadir ) datadir,
	-- ( SELECT @@tx_isolation ) tx_isolation, -- SELECT @@transaction_isolation tx_isolation
	( SELECT @@autocommit ) autocommit