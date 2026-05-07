SELECT sys.format_statement(DIGEST_TEXT) AS query,
  SCHEMA_NAME as db,
  IF(SUM_NO_GOOD_INDEX_USED > 0 OR SUM_NO_INDEX_USED > 0, '*', '') AS full_scan,
  COUNT_STAR AS exec_count,
  SUM_ERRORS AS err_count,
  SUM_WARNINGS AS warn_count,
  sys.format_time(SUM_TIMER_WAIT) AS total_latency,
  sys.format_time(MAX_TIMER_WAIT) AS max_latency,
  sys.format_time(AVG_TIMER_WAIT) AS avg_latency,
  SUM_ROWS_SENT AS rows_sent,
  ROUND(IFNULL(SUM_ROWS_SENT / NULLIF(COUNT_STAR, 0), 0)) AS rows_sent_avg,
  SUM_ROWS_EXAMINED AS rows_examined,
  ROUND(IFNULL(SUM_ROWS_EXAMINED / NULLIF(COUNT_STAR, 0), 0)) AS rows_examined_avg,
  FIRST_SEEN AS first_seen,
  LAST_SEEN AS last_seen,
  DIGEST AS digest
FROM performance_schema.events_statements_summary_by_digest stmts
JOIN sys.x$ps_digest_95th_percentile_by_avg_us AS top_percentile
ON ROUND(stmts.avg_timer_wait/1000000) >= top_percentile.avg_us
ORDER BY AVG_TIMER_WAIT DESC limit 10;