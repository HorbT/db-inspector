select db as db_name ,type as ob_type,cnt as sums from 
(select 'TABLE' type,table_schema db, count(*) cnt  from information_schema.`TABLES` a where table_type='BASE TABLE' group by table_schema
union all
select 'EVENTS' type,event_schema db,count(*) cnt from information_schema.`EVENTS` b group by event_schema
union all
select 'TRIGGERS' type,trigger_schema db,count(*) cnt from information_schema.`TRIGGERS` c group by trigger_schema
union all
select 'PROCEDURE' type,routine_schema db,count(*) cnt from information_schema.ROUTINES d where`ROUTINE_TYPE` = 'PROCEDURE' group by db
union all
select 'FUNCTION' type,routine_schema db,count(*) cnt  from information_schema.ROUTINES d where`ROUTINE_TYPE` = 'FUNCTION' group by db
union all
select 'VIEWS' type,TABLE_SCHEMA db,count(*) cnt  from information_schema.VIEWS f group by table_schema  ) t
order by db,type