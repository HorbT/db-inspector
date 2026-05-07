select *
  from (select a.inst_id, a.sid, a.serial#,
               a.sql_id,
               a.event,
               a.status,
               connect_by_isleaf as isleaf,
               sys_connect_by_path(a.SID||'@'||a.inst_id, ' <- ') tree,
               level as tree_level
          from gv$session a
         start with a.blocking_session is not null
        connect by (a.sid||'@'||a.inst_id) = prior (a.blocking_session||'@'||a.blocking_instance))
 where isleaf = 1
 order by tree_level asc;