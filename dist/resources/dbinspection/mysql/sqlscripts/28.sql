SELECT sys.format_statement(DIGEST_TEXT) AS query,
  SCHEMA_NAME as db,
  COUNT_STAR AS exec_count,
  SUM_ERRORS AS errors,
  IFNULL(SUM_ERRORS / NULLIF(COUNT_STAR, 0), 0) * 100 as error_pct,
  SUM_WARNINGS AS warnings,
  IFNULL(SUM_WARNINGS / NULLIF(COUNT_STAR, 0), 0) * 100 as warning_pct,
  FIRST_SEEN as first_seen,
  LAST_SEEN as last_seen,
  DIGEST AS digest
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_ERRORS > 0
OR SUM_WARNINGS > 0
ORDER BY SUM_ERRORS DESC, SUM_WARNINGS DESC limit 10;