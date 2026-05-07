SELECT
    '<div align="left"><font color="#336699"><b>' || i.instance_name || '</b></font></div>'  instance_name
  , p.pga_target_for_estimate
  , p.estd_extra_bytes_rw
  , p.estd_pga_cache_hit_percentage
  , p.estd_overalloc_count
FROM
    gv$pga_target_advice p
  , gv$instance  i
WHERE
    p.inst_id = i.inst_id
ORDER BY
    i.instance_name
  , p.pga_target_for_estimate;