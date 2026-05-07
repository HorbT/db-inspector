SELECT CON_ID,OWNER,
       count(1) counts,
       sum(case
             WHEN d.last_analyzed is null then
              1
             else
              0
           end) never_analyze,

       sum(case
             WHEN d.last_analyzed IS NOT NULL then
              1
             else
              0
           end) expired_analyze
  FROM (SELECT CON_ID,owner,
               table_name,
               PARTITION_NAME,
               OBJECT_TYPE,
               GLOBAL_STATS,
               last_analyzed
          FROM (SELECT t.con_id, owner,
                       table_name,
                       t.PARTITION_NAME,
                       t.OBJECT_TYPE,
                       t.GLOBAL_STATS,
                       t.last_analyzed,
                       DENSE_RANK() over(ORDER BY last_analyzed) rn
                  FROM cdb_tab_statistics t
                 WHERE (t.last_analyzed is null or
                       t.last_analyzed < SYSDATE - 15)
                   AND  table_name NOT LIKE 'BIN$%'
                   AND  table_name NOT LIKE '%TMP%'
                   AND  owner NOT IN ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
                   AND  t.SUBPARTITION_NAME is null
                   AND  (t.con_id,t.OWNER, t.TABLE_NAME) in
                       (SELECT dtm.con_id, dtm.table_owner, dtm.table_name
                          FROM cdb_tab_modifications dtm
  WHERE dtm.inserts > 100
                    or dtm.updates > 100
                    or dtm.deletes > 100))
         WHERE (rn <= 50 or LAST_ANALYZED is null)
         ORDER BY OWNER, table_name, PARTITION_NAME) d
 GROUP BY CON_ID,OWNER
 ORDER BY CON_ID,OWNER,counts desc;
