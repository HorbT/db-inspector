SELECT table_schema, table_name, index_name, last_access_time
FROM information_schema.cluster_tidb_index_usage
WHERE last_access_time IS NULL
  OR last_access_time < NOW() - INTERVAL 30 DAY;