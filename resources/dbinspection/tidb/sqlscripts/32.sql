SELECT table_schema, table_name, index_name,
       query_total, rows_access_total,
       percentage_access_0 as full_table_scans
FROM information_schema.cluster_tidb_index_usage
WHERE last_access_time IS NOT NULL AND percentage_access_0 + percentage_access_0_1 + percentage_access_1_10 + percentage_access_10_20 + percentage_access_20_50 = 0;