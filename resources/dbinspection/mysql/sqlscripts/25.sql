SELECT sys.format_statement(DIGEST_TEXT) AS query,
  SCHEMA_NAME db,
  COUNT_STAR AS exec_count,
  sys.format_time(SUM_TIMER_WAIT) AS total_latency,
  SUM_SORT_MERGE_PASSES AS sort_merge_passes,
  ROUND(IFNULL(SUM_SORT_MERGE_PASSES / NULLIF(COUNT_STAR, 0), 0)) AS avg_sort_merges,
  SUM_SORT_SCAN AS sorts_using_scans,
  SUM_SORT_RANGE AS sort_using_range,
  SUM_SORT_ROWS AS rows_sorted,
  ROUND(IFNULL(SUM_SORT_ROWS / NULLIF(COUNT_STAR, 0), 0)) AS avg_rows_sorted,
  FIRST_SEEN as first_seen,
  LAST_SEEN as last_seen,
  DIGEST AS digest
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_SORT_ROWS > 0
ORDER BY SUM_TIMER_WAIT DESC limit 10;