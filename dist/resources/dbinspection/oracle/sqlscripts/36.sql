SELECT INST_ID,
       UPPER(username) username,
       SQL_ID,
       a.buffer_gets buffer_gets,
       DISK_READS,
       LAST_LOAD_TIME,
       LAST_ACTIVE_TIME,
       a.executions,
       PARSE_CALLS,
       VERSION_COUNT,
       loads,
       ((ELAPSED_TIME / 1000000)) ELAPSED_TIME_S,
       round((a.ELAPSED_TIME / 1000000 / DECODE(a.executions,0, 1,  a.executions)),3) ELAPSED_TIME_per_exec_S,
       round(a.buffer_gets / DECODE(a.executions, 0, 1, a.executions), 3) buffer_gets_per_exec,
       round(a.disk_reads / DECODE(a.executions, 0, 1, a.executions), 3) disk_reads_per_exec,
       client_info,
       '<textarea style="width:600px;font-family:Consolas;font-size:11px;overflow:auto" rows="3">' ||a.sql_text||'</textarea>' sql_text
  FROM (SELECT ai.INST_ID,
               ai.buffer_gets,
               ai.DISK_READS,
               ai.executions,
               ai.PARSE_CALLS,
               ai.sql_text,
               ai.parsing_user_id,
               ai.SQL_ID,
               ai.ELAPSED_TIME,
               ai.LAST_LOAD_TIME,
               ai.LAST_ACTIVE_TIME,
               PARSING_SCHEMA_NAME username,
               VERSION_COUNT,
               loads,
               ai.MODULE || '--' || ai.ACTION client_info,
               DENSE_RANK() over(ORDER BY ai.EXECUTIONS desc) rank_order
          FROM gv$sqlarea ai
         WHERE buffer_gets > 1000
          AND  ai.PARSING_SCHEMA_NAME   NOT IN ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
          AND  ( ai.ACTION not in ('JOB_AUTO_TUNING_SQL_LHR') or  ai.ACTION is null)
           AND  ai.SQL_TEXT NOT LIKE '/* SQL Analyze(%'
           AND  ai.SQL_TEXT NOT LIKE '%job_subname%job_scheduled_start%'
		   and ai.executions>=5
		-- and  round((ai.ELAPSED_TIME / 1000000 / DECODE(ai.executions,0, 1,  ai.executions)),3) >=1
           ) a
 WHERE rank_order <= 10
 ORDER BY INST_ID, a.EXECUTIONS DESC;