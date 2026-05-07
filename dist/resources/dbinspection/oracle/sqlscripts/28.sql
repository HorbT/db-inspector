SELECT
    '<div align="left"><font color="#336699"><b>' || i.instance_name || '</b></font></div>'  instance_name
  , '<div align="left"><font color="#336699"><b>' || s.name          || '</b></font></div>'  pool_name
  , s.value                                                                                  bytes
FROM
    gv$sga       s
  , gv$instance  i
WHERE
    s.inst_id = i.inst_id
ORDER BY
    i.instance_name
  , s.value DESC;