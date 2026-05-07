select db_name,sum(sums) as counts from (select db as db_name ,cnt as sums from
(select table_schema db, count(*) cnt  from information_schema.`TABLES` a where table_type='BASE TABLE' group by table_schema
union all
select event_schema db,count(*) cnt from information_schema.`EVENTS` b group by event_schema
union all
select trigger_schema db,count(*) cnt from information_schema.`TRIGGERS` c group by trigger_schema
union all
select routine_schema db,count(*) cnt from information_schema.ROUTINES d where`ROUTINE_TYPE` = 'PROCEDURE' group by db
union all
select routine_schema db,count(*) cnt  from information_schema.ROUTINES d where`ROUTINE_TYPE` = 'FUNCTION' group by db
union all
select TABLE_SCHEMA db,count(*) cnt  from information_schema.VIEWS f group by table_schema  ) t
order by db) v where db_name NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys') and sums>50 group by v.db_name order by sums desc