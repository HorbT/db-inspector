SELECT d.CON_ID,
       '<font color="#336699"><b>' || username || '</font></b>' username,
       '<div align="left">' || default_tablespace || '</div>' default_tablespace,
       '<div align="left">' || temporary_tablespace || '</div>' temporary_tablespace,
       '<div align="right">' || TO_CHAR(CREATED, 'yyyy-mm-dd HH24:MI:SS') ||
       '</div>' CREATED,
       DECODE(account_status,
              'OPEN',
              '<div align="center"><b><font color="darkgreen">' ||
              account_status || '</font></b></div>',
              '<div align="center"><b><font color="#663300">' ||
              account_status || '</font></b></div>') account_status
  FROM cdb_users d
 WHERE default_tablespace = 'SYSTEM'
    AND  d.username   NOT IN ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
 ORDER BY d.CON_ID, username;
