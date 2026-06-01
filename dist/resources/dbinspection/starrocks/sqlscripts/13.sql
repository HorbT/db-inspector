select a.SCHEMA_NAME, a.DEFAULT_CHARACTER_SET_NAME,a.DEFAULT_COLLATION_NAME,
sum(table_rows) as table_rows,
truncate(sum(data_length)/1024/1024, 2) as data_size_mb,
truncate(sum(index_length)/1024/1024, 2) as index_size_mb,
truncate(sum(data_length+index_length)/1024/1024, 2) as all_size_mb,
truncate(sum(max_data_length)/1024/1024, 2) as max_size_mb,
truncate(sum(data_free)/1024/1024, 2) as free_size_mb
from INFORMATION_SCHEMA.SCHEMATA a
left outer join information_schema.tables b
on a.SCHEMA_NAME=b.TABLE_SCHEMA
group by a.SCHEMA_NAME,  a.DEFAULT_CHARACTER_SET_NAME,a.DEFAULT_COLLATION_NAME
order by sum(data_length) desc, sum(index_length) desc