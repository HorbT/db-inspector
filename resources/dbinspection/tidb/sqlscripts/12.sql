SELECT  a.TABLE_SCHEMA,
	a.`ENGINE`,
	count( * ) counts
FROM    information_schema.`TABLES` a
GROUP BY  a.TABLE_SCHEMA,a.`ENGINE`
ORDER BY a.TABLE_SCHEMA