select a.state,COUNT(*) cnt   from pg_stat_activity  a  GROUP BY a.state;
