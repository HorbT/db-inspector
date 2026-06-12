-- 最耗IO的SQL（pg_stat_statements，需要开启trace_io_timing）
SELECT calls,
       round(total_exec_time::numeric, 2) AS total_time,
       round(shared_blk_read_time::numeric, 2) AS io_read_time,
       round(shared_blk_write_time::numeric, 2) AS io_write_time,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
       query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY shared_blk_read_time + shared_blk_write_time DESC
LIMIT 10;