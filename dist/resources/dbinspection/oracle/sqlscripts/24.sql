SELECT '<div align="center"><b><font color="#336699">' || a.thread#   || '</font></b></div>'  实例名称,
       '<div align="center"><b><font color="#336699">' || a.f_time   || '</font></b></div>'  归档日期,
       '<div align="right" nowrap>' ||  round(sum(a.blocks * a.block_size) / 1024 / 1024 )  || '</div>'  每天归档日志量MB,
       '<div align="right" nowrap>' ||  round(sum(a.blocks * a.block_size) / 1024 /1024 / 24,2)  || '</div>'  每小时平均归档日志量MB,
       COUNT(1) archive_file_count
  FROM (SELECT distinct sequence#,
                        thread#,
                        blocks,
                        block_size,
                        TO_CHAR(first_time, 'yyyy-mm-dd') f_time
          FROM gv$archived_log t
WHERE t.FIRST_TIME <=sysdate  and t.FIRST_TIME >=sysdate-31 ) a
 GROUP BY a.f_time, a.thread#
 ORDER BY 1,2 desc;
