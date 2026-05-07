SELECT
  DECODE(p.isdefault,
         'FALSE', SUBSTR(p.name, 0, 512),
         SUBSTR(p.name, 0, 512)
        ) 参数名称,
  DECODE(p.isdefault,
         'FALSE', i.instance_name,
         i.instance_name
        ) 实例名称,
  DECODE(p.isdefault,
         'FALSE', SUBSTR(p.value, 0, 512),
         SUBSTR(p.value, 0, 512)
        ) 参数值
FROM gv$parameter p, gv$instance i
WHERE p.inst_id = i.inst_id
  AND p.name IN ('dg_broker_start','db_name','db_unique_name','log_archive_config','log_archive_dest_1','log_archive_dest_2','log_archive_dest_state_1','log_archive_dest_state_2','log_archive_max_processes','remote_login_passwordfile','db_file_name_convert','log_file_name_convert','standby_file_management','fal_server','fal_client','dg_broker_config_file1','dg_broker_config_file2')
ORDER BY p.name, i.instance_name;