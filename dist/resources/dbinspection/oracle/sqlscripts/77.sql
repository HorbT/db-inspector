SELECT a.CON_ID,
       '<b><font color="#336699">' || owner || '</font></b>' owner,
       db_link,
       username,
       host,
       '<div nowrap align="right">' ||
       TO_CHAR(CREATED, 'yyyy-mm-dd HH24:MI:SS') || '</div>' CREATED
  FROM cdb_db_links a
 ORDER BY a.CON_ID, owner, db_link;