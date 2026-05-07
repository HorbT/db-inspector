SELECT
    '<div align="left"><font color="#336699"><b>' || i.instance_name || '</b></font></div>'  instance_name
  , s.sga_size
  , s.sga_size_factor
  , s.estd_db_time
  , s.estd_db_time_factor
  , s.estd_physical_reads
FROM
    gv$sga_target_advice s
  , gv$instance  i
WHERE
    s.inst_id = i.inst_id
ORDER BY
    i.instance_name
  , s.sga_size_factor;