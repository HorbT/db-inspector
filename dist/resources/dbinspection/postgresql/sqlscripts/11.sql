select a.usename ,COUNT(*) cnt   from pg_stat_activity  a  GROUP BY a.usename ORDER BY cnt;
