SELECT now() now_date,
	CONNECTION_ID() CONNECTION_ID,
	DATABASE() db_name, -- SCHEMA(),
	current_version() current_version,
	--version() Server_version,
	(
		SELECT @@tx_isolation
	) tx_isolation,
	-- SELECT @@transaction_isolation tx_isolation
	(
		SELECT @@autocommit
	) autocommit