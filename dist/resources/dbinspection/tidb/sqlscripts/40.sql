SELECT table_schema,table_name,engine, Auto_increment
 FROM information_schema.tables a
 where TABLE_SCHEMA not in ('mysql', 'information_schema', 'sys', 'performance_schema')
 and  a.Auto_increment<>''
 order by a.AUTO_INCREMENT desc
limit 20