SELECT *
  FROM (SELECT p.INST_ID,
               p.spid,
               p.pid,
               s.sid,
               s.serial#,
               s.status,
               trunc(p.pga_alloc_mem/1024/1024) pga_alloc_mem_m,
               s.username,
               s.osuser,
               s.program,
               s.SQL_ID
          FROM gv$process p, gv$session s
         WHERE s.paddr(+) = p.addr
           AND  p.INST_ID = s.INST_ID
           AND  s.USERNAME not in ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
         ORDER BY p.pga_alloc_mem DESC)
 WHERE ROWNUM < 21
 ORDER BY INST_ID, pga_alloc_mem_m DESC;