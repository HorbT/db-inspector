-- 最耗共享内存的SQL（pg_stat_statements）
SELECT calls,
       round(total_exec_time::numeric, 2) AS total_time,
       round((shared_blks_hit + shared_blks_read)::numeric, 2) AS shared_mem,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
       query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY shared_blks_hit + shared_blks_read DESC
LIMIT 5;