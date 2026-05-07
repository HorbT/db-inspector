select table_schema, table_name
 from information_schema.tables
where table_type='BASE TABLE'
 and  (table_schema, table_name) not in ( select /*+ subquery(materialization) */ a.TABLE_SCHEMA,a.TABLE_NAME
           from information_schema.TABLE_CONSTRAINTS a
		   where a.CONSTRAINT_TYPE in ('PRIMARY KEY','UNIQUE')
		   and table_schema not in    ('mysql', 'information_schema', 'sys', 'performance_schema')	)
 AND table_schema not in  ('mysql', 'information_schema', 'sys', 'performance_schema')
limit 100