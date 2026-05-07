SELECT b.CON_ID, owner,
       tablespace_name,
       segment_name,
       segment_type,
       bytes,
       next_extent,
       pct_increase,
       extents,
       max_extents,
       '<div align="right">' || ROUND((extents / max_extents) * 100, 2) ||'%</div>' pct_util
  FROM cdb_segments b
 WHERE extents > max_extents / 2
   AND  max_extents != 0
   AND   b.owner   NOT IN  ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
 ORDER BY con_id, (extents / max_extents) DESC;