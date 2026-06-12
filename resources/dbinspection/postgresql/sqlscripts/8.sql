select 
    nsp.nspname as SchemaName
    ,case cls.relkind
        when 'r' then 'TABLE'
        when 'm' then 'MATERIALIZED_VIEW'
        when 'i' then 'INDEX'
        when 'S' then 'SEQUENCE'
        when 'v' then 'VIEW'
        when 'c' then 'composite type'
        when 't' then 'TOAST'
        when 'f' then 'foreign table'
        when 'p' then 'partitioned_table'
        when 'I' then 'partitioned_index'
        else cls.relkind::text
    end as ObjectType,
    COUNT(*) cnt
from pg_class cls
join pg_namespace nsp 
 on nsp.oid = cls.relnamespace
where nsp.nspname not in ('information_schema', 'pg_catalog')
  and nsp.nspname not like 'pg_toast%'
GROUP BY nsp.nspname,cls.relkind;
