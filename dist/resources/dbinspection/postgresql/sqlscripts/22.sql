SELECT
    n.nspname AS schema_name,
    c.relname AS table_name
FROM
    pg_catalog.pg_class c
JOIN
    pg_catalog.pg_namespace n
    ON c.relnamespace = n.oid
LEFT JOIN
    pg_catalog.pg_index i
    ON c.oid = i.indrelid
    AND i.indisprimary  -- 确保是主键
WHERE 
    c.relkind = 'r'  -- 只查询普通表
    AND i.indisprimary IS NULL  -- 没有主键
    and c.relname not like '%staging_gpload_reusable%'
    and n.nspname not in ('information_schema','pg_catalog')
ORDER BY
    n.nspname, c.relname
limit 100;
