SELECT sys.format_statement(DIGEST_TEXT) AS query,
  SCHEMA_NAME as db,
  COUNT_STAR AS exec_count,
  sys.format_time(SUM_TIMER_WAIT) as total_latency,
  SUM_CREATED_TMP_TABLES AS memory_tmp_tables,
  SUM_CREATED_TMP_DISK_TABLES AS disk_tmp_tables,
  ROUND(IFNULL(SUM_CREATED_TMP_TABLES / NULLIF(COUNT_STAR, 0), 0)) AS avg_tmp_tables_per_query,
  ROUND(IFNULL(SUM_CREATED_TMP_DISK_TABLES / NULLIF(SUM_CREATED_TMP_TABLES, 0), 0) * 100) AS tmp_tables_to_disk_pct,
  FIRST_SEEN as first_seen,
  LAST_SEEN as last_seen,
  DIGEST AS digest
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_CREATED_TMP_TABLES > 0
ORDER BY SUM_CREATED_TMP_DISK_TABLES DESC, SUM_CREATED_TMP_TABLES DESC limit 10;