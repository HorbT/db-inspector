SELECT ENGINE,count( * ) counts
FROM    information_schema.TABLES
where engine is not null
GROUP BY ENGINE;