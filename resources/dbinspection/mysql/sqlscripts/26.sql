SELECT object_schema,
  object_name, -- 表名
  count_read AS rows_full_scanned,  -- 全表扫描的总数据行数
  sys.format_time(sum_timer_wait) AS latency -- 完整的表扫描操作的总延迟时间（执行时间）
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NULL
AND count_read > 0
ORDER BY count_read DESC limit 10;