select state,
       sum(duration) as total_r,
       round(100 * sum(duration) / (select sum(duration) from information_schema.profiling  where query_id = 1),2) as pct_r,
       count(*) as calls,
       sum(duration) / count(*) as "r/call"
  from information_schema.profiling
 where query_id = 1
 group by state
 order by total_r desc;