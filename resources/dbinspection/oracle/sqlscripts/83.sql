SELECT *
FROM table(
  dbms_workload_repository.awr_report_html(
    (SELECT dbid FROM v$database),  -- 从v$database获取dbid
    (SELECT instance_number FROM v$instance),  -- 从v$instance获取当前实例号
    (SELECT MAX(snap_id) - 1 FROM dba_hist_snapshot WHERE instance_number = (SELECT instance_number FROM v$instance)),  -- 前一个快照ID
    (SELECT MAX(snap_id) FROM dba_hist_snapshot WHERE instance_number = (SELECT instance_number FROM v$instance))  -- 最新快照ID
  )
);