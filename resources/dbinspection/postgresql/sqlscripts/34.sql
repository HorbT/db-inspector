--运行XX毫秒的语句会被记录到日志中，-1表示禁用这个功能，0表示记录所有语句，类似-- mysql的慢查询配置
-- 查看wal日志的配置，wal日志就是redo重做日志
SELECT 
    name, 
    setting AS current_value, 
    boot_val AS default_value, 
    source 
FROM 
    pg_settings 
WHERE 
    setting != boot_val
ORDER BY name;
