SELECT
       ROUND(free.p / 1024 / 1024 / 1024) used_space,
       ROUND(free.p / 1024 / 1024 / 1024) free_space
  FROM (SELECT bytes
          FROM v$datafile
        UNION ALL
        SELECT bytes
          FROM v$tempfile
        UNION ALL
        SELECT bytes FROM v$log) used,
       (SELECT SUM(bytes) AS p FROM dba_free_space) free
 GROUP BY free.p;