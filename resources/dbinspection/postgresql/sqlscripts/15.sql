-- 阻塞锁分析
SELECT l.transactionid,
       d.datname AS db_name,
       n.nspname AS schemaname,
       c.relname AS object_name,
       l.locktype AS lock_type,
       l.mode AS lock_mode,
       CASE WHEN l.granted THEN 'granted' ELSE 'waiting' END AS lock_status,
       least(a.query_start, a.xact_start) AS query_start,
       l.pid,
       a.usename,
       a.application_name,
       a.client_addr,
       a.state,
       a.query
FROM pg_locks l
JOIN pg_database d ON l.database = d.oid
LEFT JOIN pg_class c ON l.relation = c.oid
LEFT JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.pid <> pg_backend_pid()
  AND l.locktype = 'transactionid'
ORDER BY a.query_start NULLS LAST;