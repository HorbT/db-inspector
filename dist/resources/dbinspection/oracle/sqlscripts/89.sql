SELECT '<div align="center"><font color="#336699"><b>' || a.instance_name ||
       '</b></font></div>' 实例名,
       '<div align="center">' || a.thread# || '</div>' 线程号,
       '<div align="center">' || TO_CHAR(a.count) || '</div>' 进程号,
       '<div align="center">' || b.value || '</div>' 进程数量,
       '<div align="center">' ||
       TO_CHAR(ROUND(100 * (a.count / b.value), 2)) || '%</div>' 用量百分比
  FROM (SELECT count(*) count, a1.inst_id, a2.instance_name, a2.thread#
          FROM gv$session a1, gv$instance a2
         WHERE a1.inst_id = a2.inst_id
         GROUP BY a1.inst_id, a2.instance_name, a2.thread#) a,
       (SELECT value, inst_id FROM gv$parameter WHERE name = 'processes') b
 WHERE a.inst_id = b.inst_id
 ORDER BY a.instance_name;