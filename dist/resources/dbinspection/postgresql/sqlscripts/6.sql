-- 2.查看库下面的所有schema占用的磁盘空间 schema大小
SELECT
	t.table_catalog as db,
	n.nspname AS schemaname,
	pg_size_pretty(sum(pg_table_size ( '"' || nspname || '"."' || relname || '"' ))) AS table_size
FROM pg_class C 
	LEFT JOIN pg_namespace N ON ( N.oid = C.relnamespace ) 
	left join information_schema.tables t on (n.nspname= t.table_schema and c.relname=t."table_name" )
WHERE
	nspname NOT IN ( 'information_schema' ) 
	AND relkind in ('r','p') 
	group by table_catalog,nspname;
