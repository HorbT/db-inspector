select pg_wal_lsn_diff(A .c1, replay_lsn) /(1024 * 1024) AS slave_latency_MB
from pg_stat_replication,
     pg_current_wal_lsn() AS A(c1)
ORDER BY slave_latency_MB LIMIT 1;
