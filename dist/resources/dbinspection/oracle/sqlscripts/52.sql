SELECT d.CON_ID, action_name, count(*) cnt
  FROM cdb_audit_trail d
 GROUP BY d.CON_ID, action_name
 order by d.CON_ID, action_name;
