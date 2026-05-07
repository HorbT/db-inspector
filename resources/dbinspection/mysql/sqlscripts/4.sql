select table_schema,dbsize from (
SELECT
    table_schema,
    ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS dbsize
FROM information_schema.TABLES
GROUP BY table_schema) a order by dbsize desc limit 10;