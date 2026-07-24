-- 长时间运行的SQL/阻塞会话
SELECT pgsa.pid,
       pg_blocking_pids(pgsa.pid) AS blocking_pid,
       (SELECT count(*) FROM pg_stat_activity a WHERE a.leader_pid = pgsa.pid) AS parallel_worker_cnt,
       pgsa.client_port,
       pgsa.datname,
       pgsa.usename,
       pgsa.client_addr,
       pgsa.application_name,
       pgsa.state,
       pgsa.wait_event,
       pgsa.wait_event_type,
       pgsa.backend_xid,
       pgsa.backend_xmin,
       pgsa.backend_start,
       pgsa.xact_start,
       pgsa.state_change,
       pgsa.query_start,
       TO_CHAR(INTERVAL '1 second' * trunc(EXTRACT(epoch FROM (NOW() - pgsa.query_start))), 'HH24:MI:SS') AS query_runtime,
       TO_CHAR(INTERVAL '1 second' * trunc(EXTRACT(epoch FROM (NOW() - pgsa.xact_start))), 'HH24:MI:SS') AS xact_runtime,
       TRUNC(EXTRACT(epoch FROM (NOW() - pgsa.xact_start))) AS xact_stay,
       TRUNC(EXTRACT(epoch FROM (NOW() - pgsa.query_start))) AS query_stay,
       'select pg_cancel_backend(' || pgsa.pid || ');' AS kill1,
       'select pg_terminate_backend(' || pgsa.pid || ');' AS kill2,
       'kill -9 ' || pgsa.pid AS kill3,
       pgsa.query,
       pgsa.backend_type
FROM pg_stat_activity pgsa
WHERE pgsa.state <> 'idle'
  AND pgsa.pid <> pg_backend_pid()
ORDER BY pgsa.query_start NULLS LAST;