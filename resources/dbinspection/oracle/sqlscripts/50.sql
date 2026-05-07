SELECT d.CON_ID,
       '<font color="#336699"><b>' || username || '</font></b>' username,
       '<div align="center">' || default_tablespace || '</div>' default_tablespace,
       '<div align="center">' || temporary_tablespace || '</div>' temporary_tablespace,
       '<div align="right">' || TO_CHAR(CREATED, 'yyyy-mm-dd HH24:MI:SS') ||
       '</div>' CREATED,
       DECODE(account_status,
              'OPEN',
              '<div align="center"><b><font color="darkgreen">' ||
              account_status || '</font></b></div>',
              '<div align="center"><b><font color="#663300">' ||
              account_status || '</font></b></div>') account_status
  FROM cdb_users d
 WHERE temporary_tablespace = 'SYSTEM'
 ORDER BY d.CON_ID, username;