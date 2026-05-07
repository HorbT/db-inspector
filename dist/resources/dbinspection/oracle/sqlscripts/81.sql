with pv AS (SELECT row_number() over(partition by instance_number, stat_name ORDER BY snap_id asc) row_no,
       snap_time,
       snap_id,
       instance_number,
       stat_name AS name,
       value
  FROM (SELECT cast(c.end_interval_time AS date) snap_time,
               a.snap_id,
               a.instance_number,
               b.stat_name,
               a.value
          FROM sys.wrh$_sysstat a, sys.wrh$_stat_name b, sys.WRM$_SNAPSHOT C
         WHERE a.dbid = b.dbid
           AND  a.stat_id = b.stat_id
           AND  a.snap_id = c.snap_id
           AND  a.dbid = c.dbid
           AND  a.instance_number = c.instance_number
           AND  b.stat_name in
               ('session logical reads', 'physical reads', 'execute count',
                'redo size', 'parse count (hard)', 'parse count (total)',
                'physical writes', 'user commits', 'user rollbacks',
                'CPU used by this session')
                AND  c.end_interval_time>sysdate -7)
)
SELECT  '<div nowrap align="left"><font color="#336699"><b>' || instance_number || '</b></font></div>'   instance_number,
       TO_CHAR(snap_time,'yyyy-mm-dd hh24:mi:ss') snap_time,
       round(sum(DECODE(name, 'session logical reads', value, 0)) * 8 / 1024) mem_read ,
       round(sum(DECODE(name, 'physical reads', value, 0)) * 8 / 1024) disk_read ,
       round(sum(DECODE(name, 'physical writes', value, 0)) * 8) disk_write ,
       round(sum(DECODE(name, 'redo size', value, 0)) / 1024) log_account ,
       round(sum(DECODE(name, 'parse count (hard)', value, 0))) hard_parse ,
       round(sum(DECODE(name, 'parse count (total)', value, 0))) total_parse ,
       round(sum(DECODE(name,
                        'user commits',
                        value,
                        'user rollbacks',
                        value,
                        0)))  trans,
       round(sum(DECODE(name,
                        'CPU used by this session',
                        value * bet_time / 100,
                        0))) cpu_time
  FROM (SELECT b.snap_id,
               b.snap_time,
               b.instance_number,
               b.name,
               round(b.value - a.value) /
               ((b.snap_time - a.snap_time) * 24 * 60 * 60) value,
               (b.snap_time - a.snap_time) * 24 * 60 * 60 bet_time
          FROM (SELECT row_no + 1 rowno,
                       instance_number,
                       snap_time,
                       name,
                       value
                  FROM pv) a,
               (SELECT row_no rowno,
                       instance_number,
                       snap_id,
                       snap_time,
                       name,
                       value
                  FROM pv) b
         WHERE a.rowno = b.rowno
           AND  a.name = b.name
           AND  a.instance_number = b.instance_number
 )
 GROUP BY instance_number, TO_CHAR(snap_time,'yyyy-mm-dd hh24:mi:ss')
 ORDER BY instance_number, snap_time desc;