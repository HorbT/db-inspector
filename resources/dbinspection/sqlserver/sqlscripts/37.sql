;with maco as
(
    select top 10
        plan_handle,
        sum(total_worker_time) as total_worker_time ,
        sum(execution_count) as execution_count ,
        count(1) as sql_count
    from sys.dm_exec_query_stats group by plan_handle
    order by sum(total_worker_time) desc
)
select  t.text ,
        a.total_worker_time ,
        a.execution_count ,
        a.sql_count
from    maco a
        cross apply sys.dm_exec_sql_text(plan_handle) t
