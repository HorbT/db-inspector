SELECT sys.format_statement(DIGEST_TEXT) AS query,
  SCHEMA_NAME as db,
  COUNT_STAR AS exec_count,
  sys.format_time(SUM_TIMER_WAIT) AS total_latency,
  SUM_NO_INDEX_USED AS no_index_used_count,
  SUM_NO_GOOD_INDEX_USED AS no_good_index_used_count,
  ROUND(IFNULL(SUM_NO_INDEX_USED / NULLIF(COUNT_STAR, 0), 0) * 100) AS no_index_used_pct,
  SUM_ROWS_SENT AS rows_sent,
  SUM_ROWS_EXAMINED AS rows_examined,
  ROUND(SUM_ROWS_SENT/COUNT_STAR) AS rows_sent_avg,
  ROUND(SUM_ROWS_EXAMINED/COUNT_STAR) AS rows_examined_avg,
  FIRST_SEEN as first_seen,
  LAST_SEEN as last_seen,
  DIGEST AS digest
FROM performance_schema.events_statements_summary_by_digest
WHERE (SUM_NO_INDEX_USED > 0
OR SUM_NO_GOOD_INDEX_USED > 0)
AND DIGEST_TEXT NOT LIKE 'SHOW%'
ORDER BY no_index_used_pct DESC, total_latency DESC limit 10;