-- 统计信息需要准确
SELECT
    schemaname||'.'||relname as table_name,
    pg_size_pretty(pg_table_size(schemaname||'.'||relname)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as all_size,
    pg_size_pretty(pg_table_size(schemaname||'.'||relname) *  (n_dead_tup * 100 / (n_live_tup + n_dead_tup))/100) as swell_size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100 / (n_live_tup + n_dead_tup),2) AS dead_tup_ratio,
    'vacuum full '||schemaname||'.'||relname||';
