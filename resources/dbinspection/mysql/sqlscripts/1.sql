SELECT
    -- 连接与会话维度：行转列核心是按“维度-指标名-指标值”组织数据
    '连接与会话维度' AS `指标维度`,
    '总连接数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Connections') AS `指标值`
UNION ALL
SELECT
    '连接与会话维度' AS `指标维度`,
    '历史最大并发连接数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Max_used_connections') AS `指标值`
UNION ALL
SELECT
    '连接与会话维度' AS `指标维度`,
    '最大连接数时间点' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Max_used_connections_time') AS `指标值`
UNION ALL
SELECT
    '连接与会话维度' AS `指标维度`,
    '客户端异常断开数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Aborted_clients') AS `指标值`
UNION ALL
SELECT
    '连接与会话维度' AS `指标维度`,
    '连接失败数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Aborted_connects') AS `指标值`
UNION ALL
-- 性能与吞吐量维度
SELECT
    '性能与吞吐量维度' AS `指标维度`,
    '接收总字节数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Bytes_received') AS `指标值`
UNION ALL
SELECT
    '性能与吞吐量维度' AS `指标维度`,
    '发送总字节数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Bytes_sent') AS `指标值`
UNION ALL
SELECT
    '性能与吞吐量维度' AS `指标维度`,
    '服务器运行时长' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Uptime') AS `指标值`
UNION ALL
-- InnoDB 存储引擎核心维度
SELECT
    'InnoDB 存储引擎核心维度' AS `指标维度`,
    '缓冲池总页数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_total') AS `指标值`
UNION ALL
SELECT
    'InnoDB 存储引擎核心维度' AS `指标维度`,
    '缓冲池数据页数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_data') AS `指标值`
UNION ALL
SELECT
    'InnoDB 存储引擎核心维度' AS `指标维度`,
    '缓冲池读请求总数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests') AS `指标值`
UNION ALL
SELECT
    'InnoDB 存储引擎核心维度' AS `指标维度`,
    '缓冲池物理读次数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads') AS `指标值`
UNION ALL
SELECT
    'InnoDB 存储引擎核心维度' AS `指标维度`,
    '行锁等待次数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_row_lock_waits') AS `指标值`
UNION ALL
SELECT
    'InnoDB 存储引擎核心维度' AS `指标维度`,
    '行锁平均等待时长(微秒)' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_row_lock_time_avg') AS `指标值`
UNION ALL
-- SQL 执行与临时对象维度
SELECT
    'SQL 执行与临时对象维度' AS `指标维度`,
    '临时表创建总数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_tables') AS `指标值`
UNION ALL
SELECT
    'SQL 执行与临时对象维度' AS `指标维度`,
    '磁盘临时表创建数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_disk_tables') AS `指标值`
UNION ALL
SELECT
    'SQL 执行与临时对象维度' AS `指标维度`,
    '慢查询数量' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Slow_queries') AS `指标值`
UNION ALL
-- 安全（TLS）与配置维度
SELECT
    '安全（TLS）与配置维度' AS `指标维度`,
    '支持的TLS协议版本' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Current_tls_version') AS `指标值`
UNION ALL
SELECT
    '安全（TLS）与配置维度' AS `指标维度`,
    '服务端TLS证书文件' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Current_tls_cert') AS `指标值`
UNION ALL
SELECT
    '安全（TLS）与配置维度' AS `指标维度`,
    '服务端TLS私钥文件' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Current_tls_key') AS `指标值`
UNION ALL
-- 二进制日志与事务维度
SELECT
    '二进制日志与事务维度' AS `指标维度`,
    '二进制日志缓存事务数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Binlog_cache_use') AS `指标值`
UNION ALL
SELECT
    '二进制日志与事务维度' AS `指标维度`,
    '磁盘二进制日志缓存事务数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Binlog_cache_disk_use') AS `指标值`
UNION ALL
SELECT
    '二进制日志与事务维度' AS `指标维度`,
    '事务提交总次数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Handler_commit') AS `指标值`
UNION ALL
SELECT
    '二进制日志与事务维度' AS `指标维度`,
    '事务回滚总次数' AS `指标名称`,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Handler_rollback') AS `指标值`;