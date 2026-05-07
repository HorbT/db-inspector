with tmp_s as
 (SELECT curr_redo - last_redo redosize,
         curr_logicalreads - last_logicalreads logicalreads,
         curr_physicalreads - last_physicalreads physicalreads,
         curr_executes - last_executes executes,
         curr_parse - last_parse parse,
         curr_hardparse - last_hardparse hardparse,
         DECODE((curr_transactions - last_transactions),
                0,
                NULL,
                (curr_transactions - last_transactions)) transactions,
         round(((currtime + 0) - (lasttime + 0)) * 3600 * 24, 0) seconds,
         TO_CHAR(currtime, 'yyyy-mm-dd') snap_date,
         TO_CHAR(currtime, 'hh24:mi') currtime,
         TO_CHAR(lasttime, 'YYYY-MM-DD HH24:MI') || '~' ||
         TO_CHAR(currtime, 'YYYY-MM-DD HH24:MI') snap_time_range,
         currsnap_id endsnap_id,
         TO_CHAR(startup_time, 'yyyy-mm-dd hh24:mi:ss') startup_time,
         sessions || '~' || currsessions sessions,
         Cursors1 || '~' || currCursors Cursors2,
         instance_number
    FROM (SELECT a.redo last_redo,
                 a.logicalreads last_logicalreads,
                 a.physicalreads last_physicalreads,
                 a.executes last_executes,
                 a.parse last_parse,
                 a.hardparse last_hardparse,
                 a.transactions last_transactions,
                 a.sessions,
                 trunc(a.Cursors / a.sessions, 2) Cursors1,
                 lead(a.redo, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) curr_redo,
                 lead(a.logicalreads, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) curr_logicalreads,
                 lead(a.physicalreads, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) curr_physicalreads,
                 lead(a.executes, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) curr_executes,
                 lead(a.parse, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) curr_parse,
                 lead(a.hardparse, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) curr_hardparse,
                 lead(a.transactions, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) curr_transactions,
                 b.end_interval_time lasttime,
                 lead(b.end_interval_time, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) currtime,
                 lead(b.snap_id, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) currsnap_id,
                 lead(a.sessions, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) currsessions,
                 lead(trunc(a.Cursors / a.sessions, 2), 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) currCursors,
                 b.startup_time,
                 b.instance_number
            FROM (SELECT snap_id,
                         dbid,
                         instance_number,
                         SUM(DECODE(stat_name, 'redo size', VALUE, 0)) redo,
                         SUM(DECODE(stat_name,
                                    'session logical reads',
                                    VALUE,
                                    0)) logicalreads,
                         SUM(DECODE(stat_name, 'physical reads', VALUE, 0)) physicalreads,
                         SUM(DECODE(stat_name, 'execute count', VALUE, 0)) executes,
                         SUM(DECODE(stat_name, 'parse count (total)', VALUE, 0)) parse,
                         SUM(DECODE(stat_name, 'parse count (hard)', VALUE, 0)) hardparse,
                         SUM(DECODE(stat_name,
                                    'user rollbacks',
                                    VALUE,
                                    'user commits',
                                    VALUE,
                                    0)) transactions,
                         SUM(DECODE(stat_name, 'logons current', VALUE, 0)) sessions,
                         SUM(DECODE(stat_name,
                                    'opened cursors current',
                                    VALUE,
                                    0)) Cursors
                    FROM dba_hist_sysstat
                   WHERE stat_name IN ('redo size',
                                       'session logical reads',
                                       'physical reads',
                                       'execute count',
                                       'user rollbacks',
                                       'user commits',
                                       'parse count (hard)',
                                       'parse count (total)',
                                       'logons current',
                                       'opened cursors current')
                   GROUP BY snap_id, dbid, instance_number) a,
                 dba_hist_snapshot b
           WHERE a.snap_id = b.snap_id
             AND  a.dbid = b.dbid
             AND  a.instance_number = b.instance_number
             AND  b.end_interval_time > SYSDATE - 7
           ORDER BY end_interval_time)),
tmp_t as
 (SELECT lead(a.value, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) - a.value db_time,
         lead(b.snap_id, 1, NULL) over(PARTITION BY b.instance_number, b.startup_time ORDER BY b.end_interval_time) endsnap_id,
         b.snap_id,
         b.instance_number
    FROM dba_hist_sys_time_model a, dba_hist_snapshot b
   WHERE a.snap_id = b.snap_id
     AND  a.dbid = b.dbid
     AND  a.instance_number = b.instance_number
     AND  a.stat_name = 'DB time'),
tmp_ash as
 (SELECT inst_id, snap_id, count(1) counts
    FROM (SELECT n.instance_number inst_id,
                 n.snap_id,
                 n.session_id,
                 n.session_serial#
            FROM dba_hist_active_sess_history n
           GROUP BY n.instance_number,
                    n.snap_id,
                    n.session_id,
                    n.session_serial#) nt
   GROUP BY nt.inst_id, nt.snap_id)
SELECT s.snap_date,
       s.instance_number inst_id,
       snap_time_range,
       t.snap_id || '~' || (t.snap_id + 1) snap_id_range,
       DECODE(s.redosize, NULL, '--shutdown or end--', s.currtime) "TIME",
       startup_time,
       TO_CHAR(round(s.seconds / 60, 2)) "Elapsed(min)",
       round(t.db_time / 1000000 / 60, 2) "DB_time(min)",
       s.sessions,
       (SELECT counts
          FROM tmp_ash nnt
         WHERE s.instance_number = nnt.inst_id
           AND  nnt.snap_id = t.snap_id) || '~' ||
       (SELECT counts
          FROM tmp_ash nnt
         WHERE s.instance_number = nnt.inst_id
           AND  nnt.snap_id = t.snap_id + 1) active_session,
       s.Cursors2 "Cursors/Session",
       s.redosize redo,
       round(s.redosize / s.seconds, 2) "redo/s",
       round(s.redosize / s.transactions, 2) "redo/t",
       s.logicalreads logical,
       round(s.logicalreads / s.seconds, 2) "logical/s",
       round(s.logicalreads / s.transactions, 2) "logical/t",
       physicalreads physical,
       round(s.physicalreads / s.seconds, 2) "phy/s",
       round(s.physicalreads / s.transactions, 2) "phy/t",
       s.executes execs,
       round(s.executes / s.seconds, 2) "execs/s",
       round(s.executes / s.transactions, 2) "execs/t",
       s.parse,
       round(s.parse / s.seconds, 2) "parse/s",
       round(s.parse / s.transactions, 2) "parse/t",
       s.hardparse,
       round(s.hardparse / s.seconds, 2) "hardparse/s",
       round(s.hardparse / s.transactions, 2) "hardparse/t",
       s.transactions trans,
       round(s.transactions / s.seconds, 2) "trans/s"
  FROM tmp_s s, tmp_t t
 WHERE s.endsnap_id = t.endsnap_id
   AND  t.instance_number = s.instance_number
 ORDER BY s.instance_number, s.snap_date DESC, snap_id DESC, TIME ASC;