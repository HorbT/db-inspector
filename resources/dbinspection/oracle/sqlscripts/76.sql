SELECT a.CON_ID,
       nvl(a.owner, '合计') owner,
       round(SUM(a.space *
                 (SELECT value FROM v$parameter WHERE name = 'db_block_size')) / 1024 / 1024,
             3) recyb_size,
       count(1) recyb_cnt
  FROM cdb_recyclebin a
 GROUP BY a.CON_ID, ROLLUP(a.owner);