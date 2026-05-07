select
       inst.instance_number 实例,
       db.name 数据库名,
       inst.instance_name 实例名,
       inst.version_full 数据库版本,
       case inst.status
           when 'OPEN' then
               '<span class="text-success"><i class="fa fa-check-circle mr-1"></i> ' || inst.status || '</span>'
           when 'MOUNT' then
               '<span class="text-warning"><i class="fa fa-exclamation-triangle mr-1"></i> ' || inst.status || '</span>'
           when 'STARTUP' then
               '<span class="text-warning"><i class="fa fa-exclamation-triangle mr-1"></i> ' || inst.status || '</span>'
           when 'NOMOUNT' then
               '<span class="text-danger"><i class="fa fa-times-circle mr-1"></i> ' || inst.status || '</span>'
           when 'SHUTDOWN' then
               '<span class="text-danger"><i class="fa fa-power-off mr-1"></i> ' || inst.status || '</span>'
           else
               '<span class="text-neutral-dark"><i class="fa fa-question-circle mr-1"></i> ' || inst.status || '</span>'
       end 数据库状态,
       inst.host_name 主机名,
       inst.startup_time 启动时间,
       inst.database_type 架构类型,
       userenv('language') 字符集
  from gv$database db
  join gv$instance inst 
    on db.inst_id = inst.instance_number; 