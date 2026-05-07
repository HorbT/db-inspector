SELECT d.CON_ID, OWNER, count(1)  cnt
  FROM cdb_triggers d
 GROUP BY d.CON_ID, owner
 ORDER BY d.CON_ID, cnt desc;