SELECT *
  FROM (SELECT d.INSTANCE_NUMBER inst_id,
               d.snap_id,
               d.dbid,
               (SELECT (nb.snap_interval)
                  FROM dba_hist_wr_control nb) snap_interval,
               (SELECT (nb.retention)
                  FROM dba_hist_wr_control nb) retention,
               TO_CHAR(d.startup_time, 'YYYY-MM-DD HH24:MI:SS.ff') startup_time,
               TO_CHAR(d.begin_interval_time, 'YYYY-MM-DD HH24:MI:SS.ff') begin_interval_time,
               TO_CHAR(d.end_interval_time, 'YYYY-MM-DD HH24:MI:SS.ff') end_interval_time,
               (d.flush_elapsed) flush_elapsed,
               d.snap_level,
               d.error_count,
               d.snap_flag,
               'SELECT * FROM table(dbms_workload_repository.ash_report_html(' ||
               d.dbid || ',' || d.instance_number ||
               ',  (SELECT a.end_interval_time
                                                       FROM   dba_hist_ash_snapshot a
                                                       WHERE  a.snap_id =' ||
               (d.SNAP_ID - 1) ||
               ') , (SELECT a.end_interval_time
                                                       FROM   dba_hist_ash_snapshot a
                                                       WHERE  a.snap_id =' ||
               (d.SNAP_ID) || ')));' ash_report,
               (DENSE_RANK()
                OVER(partition by instance_number ORDER BY d.instance_number,
                     d.snap_id DESC)) RK
          FROM dba_hist_ash_snapshot d
         WHERE d.end_interval_time > sysdate - 7
         ORDER BY d.INSTANCE_NUMBER, d.snap_id DESC) t
 WHERE t.rk <= 50
 ORDER BY t.inst_id, t.snap_id DESC;