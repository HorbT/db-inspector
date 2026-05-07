SELECT '<div align="center">' || rownuM || '</div>' ID,
       '<div align="center">' || WARING_LEVEL || '</div>' WARING_LEVEL,
       v.CHECK_TYPE,
       v.CHECK_MESSAGE,
       v.CHECK_MESSAGE_DETAIL_LINK
  FROM (select SUBSTR(health_check_results,
                      instr(health_check_results, '|', 1) + 1,
                      1) WARING_LEVEL,
               SUBSTR(health_check_results,
                      instr(health_check_results, '|', 1, 2) + 1,
                      INSTR(health_check_results, '|', 1, 3) -
                      instr(health_check_results, '|', 1, 2) - 1) CHECK_TYPE,
               SUBSTR(health_check_results,
                      INSTR(health_check_results, '|', 1, 3) + 1,
                      INSTR(health_check_results, '|', 1, 4) -
                      INSTR(health_check_results, '|', 1, 3) - 1) CHECK_MESSAGE,
               SUBSTR(health_check_results,
                      INSTR(health_check_results, '|', 1, 4) + 1) CHECK_MESSAGE_DETAIL_LINK
          from (select case
                         when (SELECT COUNT(1)
                                 FROM V$PARAMETER D
                                WHERE D.NAME = 'spfile'
                                  AND D.VALUE IS NOT NULL) = 0 then
                          (select 1 || '|' || 5 || '|' || '巡检服务概要.参数文件' || '|' ||
                                  '数据库未使用spfile文件，强烈推荐创建spfile文件' || '|' ||
                                  '[<a class="noLink" href="#section-1-2-2"><font size=1 face="Consolas" color="#336699"><b>参考：所有的初始化参数</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end AS health_check_results
                  from dual
                UNION ALL
                select case
                         when (SELECT SUM(COUNTS)
                                 FROM (SELECT COUNT(1) COUNTS
                                         FROM CDB_DATA_FILES D
                                        WHERE D.ONLINE_STATUS = 'OFFLINE'
                                       UNION ALL
                                       SELECT COUNT(1)
                                         FROM CDB_TEMP_FILES D
                                        WHERE D.STATUS = 'OFFLINE')) > 0 then
                          (select 2 || '|' || 1 || '|' || '巡检服务概要.表空间情况.数据文件状况' || '|' ||
                                  '数据库里有OFFLINE状态的数据文件，建议立刻修复该问题' || '|' ||
                                  '[<a class="noLink" href="#section-1-3-4"><font size=1 face="Consolas" color="#336699"><b>参考：数据文件状况</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT COUNT(1)
                                 FROM V$ASM_DISKGROUP DI
                                WHERE (DI.TOTAL_MB - DI.FREE_MB) / DI.TOTAL_MB >= 0.95) > 0 then
                          (select 3 || '|' || 3 || '|' || '巡检服务概要.ASM磁盘监控' || '|' ||
                                  'ASM磁盘空间不足' || '|' ||
                                  '[<a class="noLink" href="#section-1-4-2"><font size=1 face="Consolas" color="#336699"><b>参考：ASM磁盘组使用情况</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT SUM(COUNTS)
                                 FROM (SELECT COUNT(1) COUNTS
                                         FROM CDB_SCHEDULER_JOB_LOG D
                                        WHERE D.OWNER NOT like '%SYS%'
                                          AND D.STATUS <> 'SUCCEEDED'
                                          AND D.LOG_DATE >= SYSDATE - 15
                                       UNION ALL
                                       SELECT COUNT(1)
                                         FROM CDB_JOBS D
                                        WHERE D.SCHEMA_USER NOT like '%SYS%'
                                          AND D.FAILURES > 0
                                          AND D.LAST_DATE >= SYSDATE - 15)) > 0 then
                          (select 4 || '|' || 5 || '|' || '巡检服务概要.JOB情况' || '|' ||
                                  '近一个月内JOB有错误出现，请检查是否有影响业务数据的JOB' || '|' ||
                                  '[<a class="noLink" href="#section-1-5-1"><font size=1 face="Consolas" color="#336699"><b>参考：作业运行状况</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT count(1) FROM v$backup_set) < 2 then
                          (select 5 || '|' || 2 || '|' || '巡检服务明细.RMAN信息' || '|' ||
                                  '数据库无RMAN备份信息，强烈建议对数据库进行备份' || '|' ||
                                  '[<a class="noLink" href="#section-2-1"><font size=1 face="Consolas" color="#336699"><b>参考：RMAN信息</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (select count(*)
                                 from (select l.force_matching_signature,
                                              max(l.sql_id || l.child_number) max_sql_child,
                                              dense_rank() over (order by count(*) desc) ranking,
                                              count(*) counts
                                         from gv$sql l
                                        where l.force_matching_signature <> 0
                                          and l.parsing_schema_name NOT IN
                                              ('SYS',
                                               'SYSTEM',
                                               'PUBLIC',
                                               'MDSYS',
                                               'TSMSYS',
                                               'DMSYS',
                                               'DBSNMP',
                                               'SCOTT',
                                               'LHR',
                                               'LHR2',
                                               'DB_MONITOR',
                                               'OUTLN',
                                               'MGMT_VIEW',
                                               'FLOWS_FILES',
                                               'ORDSYS',
                                               'EXFSYS',
                                               'WMSYS',
                                               'APPQOSSYS',
                                               'APEX_030200',
                                               'APEX_050000',
                                               'OWBSYS_AUDIT',
                                               'ORDDATA',
                                               'CTXSYS',
                                               'ANONYMOUS',
                                               'SYSMAN',
                                               'XDB',
                                               'ORDPLUGINS',
                                               'OWBSYS',
                                               'SI_INFORMTN_SCHEMA',
                                               'OLAPSYS',
                                               'ORACLE_OCM',
                                               'XS$NULL',
                                               'BI',
                                               'PM',
                                               'MDDATA',
                                               'IX',
                                               'SH',
                                               'DIP',
                                               'OE',
                                               'APEX_PUBLIC_USER',
                                               'HR',
                                               'SPATIAL_CSW_ADMIN_USR',
                                               'SPATIAL_WFS_ADMIN_USR',
                                               'APEX_040200',
                                               'DVSYS',
                                               'LBACSYS',
                                               'GSMADMIN_INTERNAL',
                                               'AUDSYS',
                                               'OJVMSYS',
                                               'SYS$UMF',
                                               'GGSYS',
                                               'DBSFWUSER',
                                               'DVF',
                                               'GSMCATUSER',
                                               'SYSBACKUP',
                                               'REMOTE_SCHEDULER_AGENT',
                                               'GSMUSER',
                                               'SYSRAC',
                                               'SYSKM',
                                               'SYSDG',
                                               'PDBADMIN',
                                               'WKSYS',
                                               'GSMROOTUSER',
                                               'CSMIG',
                                               'WKPROXY',
                                               'WK_TEST',
                                               'SI_INFORMATN_SCHEMA')
                                        group by l.force_matching_signature
                                       having count(*) > 10)) > 0 then
                          (select 6 || '|' || 2 || '|' ||
                                  '巡检服务明细.SQL监控.未使用绑定变量的SQL语句' || '|' ||
                                  '未使用绑定变量的SQL语句会引起librarycache命中率降低，降低系统性能' || '|' ||
                                  '[<a class="noLink" href="#section-2-5-9"><font size=1 face="Consolas" color="#336699"><b>参考：未使用绑定变量的SQL语句</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                
                UNION ALL
                select case
                         when (select count(*)
                                 from (SELECT AL.THREAD#,
                                              ADS.DEST_ID,
                                              ADS.DEST_NAME,
                                              MAX((SELECT ADS.TYPE || ' ' ||
                                                         AD.TARGET
                                                    FROM V$ARCHIVE_DEST AD
                                                   WHERE AD.DEST_ID =
                                                         ADS.DEST_ID)) TARGET,
                                              ADS.DATABASE_MODE,
                                              ADS.STATUS,
                                              ADS.ERROR,
                                              ADS.RECOVERY_MODE,
                                              ADS.DB_UNIQUE_NAME,
                                              ADS.DESTINATION,
                                              (SELECT CASE
                                                        WHEN NB.DATABASE_ROLE like
                                                             '%STANDBY%' then
                                                         (SELECT MAX(sequence#)
                                                            FROM v$standby_log na
                                                           WHERE na.thread# =
                                                                 al.thread#)
                                                        ELSE
                                                         (SELECT MAX(sequence#)
                                                            FROM v$log na
                                                           WHERE na.thread# =
                                                                 al.thread#)
                                                      END
                                                 FROM V$DATABASE NB) Current_Seq#,
                                              MAX(SEQUENCE#) LAST_ARCHIVED,
                                              max(CASE
                                                    WHEN al.APPLIED = 'YES' AND
                                                         aL.STANDBY_DEST =
                                                         (SELECT CASE
                                                                   WHEN NB.DATABASE_ROLE like
                                                                        '%STANDBY%' then
                                                                    'NO'
                                                                   ELSE
                                                                    'YES'
                                                                 END
                                                            FROM V$DATABASE NB) THEN
                                                     al.sequence#
                                                  end) APPLIED_SEQ#
                                         FROM (SELECT *
                                                 FROM V$ARCHIVED_LOG V
                                                WHERE V.RESETLOGS_CHANGE# =
                                                      (SELECT D.RESETLOGS_CHANGE#
                                                         FROM V$DATABASE D)) AL,
                                              V$ARCHIVE_DEST_STATUS ADS
                                        WHERE AL.DEST_ID(+) = ADS.DEST_ID
                                          AND ads.STATUS != 'INACTIVE'
                                          and DEST_NAME <>
                                              'STANDBY_ARCHIVE_DEST'
                                        GROUP BY AL.THREAD#,
                                                 ADS.DEST_ID,
                                                 ADS.DEST_NAME,
                                                 ADS.STATUS,
                                                 ADS.ERROR,
                                                 ADS.TYPE,
                                                 ADS.DATABASE_MODE,
                                                 ADS.RECOVERY_MODE,
                                                 ADS.DB_UNIQUE_NAME,
                                                 ADS.DESTINATION)
                                WHERE (ERROR IS NOT NULL OR STATUS <> 'VALID' OR
                                      LAST_ARCHIVED > APPLIED_SEQ# + 2 OR
                                      Current_Seq# > LAST_ARCHIVED + 3)) > 0 then
                          (select 7 || '|' || 2 || '|' || '巡检服务明细.DG库' || '|' ||
                                  '数据库DG库运行不正常，请点击右边连接查看DG库的详情' || '|' ||
                                  '[<a class="noLink" href="#section-2-6"><font size=1 face="Consolas" color="#336699"><b>参考：DG库</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                
                UNION ALL
                select case
                         when (SELECT COUNT(1)
                                 FROM CDB_OBJECTS
                                WHERE OWNER NOT IN ('PUBLIC')
                                  AND STATUS <> 'VALID') > 0 then
                          (select 8 || '|' || 4 || '|' || '数据库对象.无效对象' || '|' ||
                                  '数据库里有无效的对象，建议重新编译' || '|' ||
                                  '[<a class="noLink" href="#section-4-4"><font size=1 face="Consolas" color="#336699"><b>参考：无效对象</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                
                UNION ALL
                select case
                         when (SELECT COUNT(1)
                                 FROM (SELECT ROUND((SUM(A.SPACE *
                                                         (SELECT VALUE
                                                            FROM V$PARAMETER
                                                           WHERE NAME =
                                                                 'db_block_size'))) / 1024 / 1024,
                                                    2) SIZE_M
                                         FROM CDB_RECYCLEBIN A)
                                WHERE SIZE_M > 1024) > 0 then
                          (select 9 || '|' || 4 || '|' || '数据库对象.其他对象.回收站情况' || '|' ||
                                  '回收站有无用对象' || '|' ||
                                  '[<a class="noLink" href="#section-4-7-2"><font size=1 face="Consolas" color="#336699"><b>参考：回收站情况</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT COUNT(1)
                                 FROM CDB_HIST_ACTIVE_SESS_HISTORY D,
                                      CDB_USERS                    A
                                WHERE D.USER_ID = A.USER_ID
                                  AND D.CON_ID = A.CON_ID
                                  AND USERNAME NOT LIKE '%SYS%'
                                  AND D.EVENT LIKE 'enq: SQ%') > 0 then
                          (select 10 || '|' || 2 || '|' ||
                                  '数据库对象.其他对象.序列cache小于20' || '|' ||
                                  '数据库序列的cache值小于20，可能伴随有enq: SQ - contention等待事件' || '|' ||
                                  '[<a class="noLink" href="#section-4-7-6"><font size=1 face="Consolas" color="#336699"><b>序列cache小于20</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT COUNT(1)
                                 FROM gv$session A
                                WHERE A.STATUS IN ('INACTIVE')
                                  AND A.USERNAME IS NOT NULL
                                  AND A.USERNAME not in ('SYS')
                                  AND A.LAST_CALL_ET >= 60 * 60 * 10) > 0 then
                          (select 11 || '|' || 2 || '|' ||
                                  '数据库性能分析.会话.超过10小时无响应的会话' || '|' ||
                                  '超过10小时无响应的会话可以考虑将其kill掉来释放资源' || '|' ||
                                  '[<a class="noLink" href="#section-5-5-2"><font size=1 face="Consolas" color="#336699"><b>参考：超过10小时无响应的会话</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (select count(*)
                                 from (SELECT g.inst_id,
                                              sum(pinhits) / sum(pins)
                                         FROM Gv$librarycache g
                                        group by g.inst_id
                                       having sum(pinhits) / sum(pins) < 0.95)) > 0 then
                          (select 12 || '|' || 2 || '|' || '数据库性能分析.内存占用.命中率' || '|' ||
                                  '低于 95%，则需要调整应用程序使用绑定变量，或者调整数据库参数shared_pool_size的大小' || '|' ||
                                  '[<a class="noLink" href="#section-5-7-3"><font size=1 face="Consolas" color="#336699"><b>参考：librarycache 整体命中率</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT count(1)
                                 FROM (SELECT TABLESPACE_NAME,
                                              d.CON_ID,
                                              SUM(BYTES) all_bytes
                                         FROM cdb_data_files d
                                        GROUP BY TABLESPACE_NAME, d.CON_ID) a,
                                      (SELECT TABLESPACE_NAME,
                                              d.CON_ID,
                                              SUM(BYTES) FREESIZ
                                         FROM cdb_free_space d
                                        GROUP BY TABLESPACE_NAME, d.CON_ID) b
                                where a.TABLESPACE_NAME = b.TABLESPACE_NAME
                                  and a.con_id = b.con_id
                                  and round((a.all_bytes - b.FREESIZ) /
                                            a.all_bytes,
                                            2) >= 0.96) > 0 then
                          (select 13 || '|' || 1 || '|' ||
                                  '巡检服务概要.表空间情况.表空间状况信息' || '|' ||
                                  '若表空间使用率大于96%，则考虑增加表空间的大小' || '|' ||
                                  '[<a class="noLink" href="#section-1-3-1"><font size=1 face="Consolas" color="#336699"><b>参考：表空间状况信息</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT SUM(COUNTS)
                                 FROM (SELECT COUNT(1) COUNTS
                                         FROM CDB_AUTOTASK_CLIENT D
                                        WHERE CLIENT_NAME =
                                              'auto optimizer stats collection'
                                       UNION ALL
                                       SELECT COUNT(1)
                                         FROM (SELECT A.WINDOW_NAME,
                                                      TO_CHAR(WINDOW_NEXT_TIME,
                                                              'YYYY-MM-DD HH24:MI:SS') WINDOW_NEXT_TIME,
                                                      WINDOW_ACTIVE,
                                                      AUTOTASK_STATUS,
                                                      OPTIMIZER_STATS,
                                                      SEGMENT_ADVISOR,
                                                      SQL_TUNE_ADVISOR,
                                                      B.REPEAT_INTERVAL,
                                                      B.DURATION,
                                                      B.ENABLED,
                                                      B.RESOURCE_PLAN
                                                 FROM CDB_AUTOTASK_WINDOW_CLIENTS A,
                                                      (SELECT T1.CON_ID,
                                                              T1.WINDOW_NAME,
                                                              T1.REPEAT_INTERVAL,
                                                              T1.DURATION,
                                                              T1.ENABLED,
                                                              T1.RESOURCE_PLAN
                                                         FROM CDB_SCHEDULER_WINDOWS          T1,
                                                              CDB_SCHEDULER_WINGROUP_MEMBERS T2
                                                        WHERE T1.WINDOW_NAME =
                                                              T2.WINDOW_NAME
                                                          AND T1.CON_ID =
                                                              T2.CON_ID
                                                          AND T2.WINDOW_GROUP_NAME IN
                                                              ('MAINTENANCE_WINDOW_GROUP',
                                                               'BSLN_MAINTAIN_STATS_SCHED')) B
                                                WHERE A.WINDOW_NAME =
                                                      B.WINDOW_NAME
                                                  AND A.CON_ID = B.CON_ID) AA
                                        WHERE AA.AUTOTASK_STATUS = 'ENABLED')) <>
                              (SELECT count(*) * 8
                                 FROM v$containers a
                                WHERE a.NAME <> 'PDB$SEED'
                                  AND A.OPEN_MODE = 'READ WRITE') then
                          (select 14 || '|' || 2 || '|' ||
                                  '数据库性能分析.统计信息.统计信息是否自动收集' || '|' ||
                                  '数据库的统计信息没有开启自动收集功能，强烈建议开启该功能' || '|' ||
                                  '[<a class="noLink" href="#section-5-4-1"><font size=1 face="Consolas" color="#336699"><b>参考：统计信息是否自动收集</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                
                UNION ALL
                select case
                         when (SELECT COUNT(*)
                                 FROM v$diag_alert_ext T
                                WHERE T.MESSAGE_TEXT LIKE '%ORA-%'
                                  AND trim(t.COMPONENT_ID) = 'rdbms'
                                  and t.FILENAME LIKE
                                      '%' ||
                                      sys_context('USERENV', 'INSTANCE_NAME') || '%'
                                  AND t.ORIGINATING_TIMESTAMP >= sysdate - 7) > 0 then
                          (select 15 || '|' || 2 || '|' || '数据库对象.其他对象.告警日志' || '|' ||
                                  '数据库告警日志有ora错误，请详细检查告警日志内容' || '|' ||
                                  '[<a class="noLink" href="#section-4-7-1"><font size=1 face="Consolas" color="#336699"><b>参考：告警日志</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT COUNT(*)
                                 FROM v$pdbs a
                                where a.OPEN_MODE in ('MOUNTED')
                                   or a.RESTRICTED = 'YES') > 0 then
                          (select 16 || '|' || 2 || '|' ||
                                  '数据库总体概况.数据库基本信息.PDB情况' || '|' || 'PDB状态不正确' || '|' ||
                                  '[<a class="noLink" href="#section-1-1-1"><font size=1 face="Consolas" color="#336699"><b>参考：PDB情况</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual
                UNION ALL
                select case
                         when (SELECT COUNT(*) FROM V$CONTROLFILE a) < 2 then
                          (select 17 || '|' || 2 || '|' || '巡检服务概要.表空间情况.控制文件' || '|' ||
                                  '控制文件无双路镜像，建议对控制文件镜像' || '|' ||
                                  '[<a class="noLink" href="#section-1-3-5"><font size=1 face="Consolas" color="#336699"><b>参考：控制文件</b></font></a>]<p>' CHECK_MESSAGE_DETAIL_LINK
                             from dual)
                       end
                  from dual)
         where SUBSTR(health_check_results,
                      instr(health_check_results, '|', 1) + 1,
                      1) is not null) V;
