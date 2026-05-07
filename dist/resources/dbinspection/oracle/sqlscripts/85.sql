SELECT *
  FROM table(dbms_workload_repository.ash_report_html((SELECT dbid
                                                        FROM v$database),
                                                      (SELECT instance_number
                                                         FROM v$instance),
                                                      (SELECT a.end_interval_time
                                                         FROM dba_hist_ash_snapshot a
                                                        WHERE a.snap_id =
                                                              (SELECT snap_id ash_snap_id
                                                                 FROM (SELECT d.snap_id,
                                                                              lead(d.snap_id) over (partition by d.startup_time ORDER BY snap_id) snap_id1
                                                                         FROM dba_hist_ash_snapshot d,
                                                                              v$instance            nd
                                                                        WHERE d.instance_number =
                                                                              nd.INSTANCE_NUMBER
                                                                        ORDER BY d.snap_id desc) t
                                                                WHERE snap_id1 IS NOT NULL
                                                                  AND ROWNUM = 1)
                                                          AND a.INSTANCE_NUMBER =
                                                              (SELECT instance_number
                                                                 FROM v$instance)),
                                                      (SELECT a.end_interval_time
                                                         FROM dba_hist_ash_snapshot a
                                                        WHERE a.snap_id =
                                                              (SELECT snap_id1 ash_snap_id1
                                                                 FROM (SELECT d.snap_id,
                                                                              lead(d.snap_id) over (partition by d.startup_time ORDER BY snap_id) snap_id1
                                                                         FROM dba_hist_ash_snapshot d,
                                                                              v$instance            nd
                                                                        WHERE d.instance_number =
                                                                              nd.INSTANCE_NUMBER
                                                                        ORDER BY d.snap_id desc) t
                                                                WHERE snap_id1 IS NOT NULL
                                                                  AND ROWNUM = 1)
                                                          AND a.INSTANCE_NUMBER =
                                                              (SELECT instance_number
                                                                 FROM v$instance))));
