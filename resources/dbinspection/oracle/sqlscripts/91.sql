SELECT t.*, s.sid, s.serial#, s.machine, s.program, s.osuser
  FROM (SELECT b.con_id, b.INST_ID,
               c.USERNAME,
               a.event,
               TO_CHAR(a.cnt) AS seconds,
               a.sql_id,
               --dbms_lob.substr(b.sql_fulltext, 100, 1) sqltext ,
               b.SQL_TEXT
          FROM (SELECT ROWNUM rn, t.*
                  FROM (SELECT s.con_id, s.INST_ID,
                               DECODE(s.session_state,
                                      'WAITING',
                                      s.event,
                                      'Cpu + Wait For Cpu') Event,
                               s.sql_id,
                               s.user_id,
                               COUNT(*) CNT
                          FROM gv$active_session_history s
                         WHERE sample_time > SYSDATE - 15 / 1440
                         GROUP BY s.con_id, INST_ID,
                                  s.user_id,
                                  DECODE(s.session_state,
                                         'WAITING',
                                         s.event,
                                         'Cpu + Wait For Cpu'),
                                  s.sql_id
                         ORDER BY CNT DESC) t
                 WHERE ROWNUM < 20) a,
               gv$sqlarea b,
               cdb_users c
         WHERE a.sql_id = b.sql_id
           AND  a.user_id = c.user_id
           AND  a.INST_ID = b.INST_ID
					 and b.con_id=c.con_id
					 and a.con_id=b.con_id
           AND  c.username NOT IN ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
         ORDER BY CNT DESC) t,
       gv$session s
 WHERE t.sql_id = s.sql_id(+)
   AND  t.INST_ID = s.INST_ID(+)
	 and t.con_id=s.con_id(+)
 ORDER BY t.con_id,t.INST_ID;