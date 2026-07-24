-- 活跃会话详情（非idle状态，取100条）
SELECT datid, datname, pid::VARCHAR AS pid, leader_pid, usesysid, usename,
       application_name, client_addr, client_hostname, client_port,
       backend_start, xact_start, query_start, state_change,
       wait_event_type, wait_event, state, backend_xid, backend_xmin,
       query_id, backend_type, query
FROM pg_stat_activity
WHERE state NOT IN ('idle') OR state IS NULL
ORDER BY state, query_start, query
LIMIT 100;