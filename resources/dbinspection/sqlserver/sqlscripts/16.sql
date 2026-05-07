SELECT 
    DB_NAME() AS database_name,
    -- 计算数据库总大小（数据文件+日志文件），转换为MB
    LTRIM(STR(
        (CONVERT(DECIMAL(18, 2), data_file_size) + CONVERT(DECIMAL(18, 2), log_file_size))
        * 8192 / 1048576,  -- 转换为MB（1MB=1048576字节，1页=8192字节）
        18, 2  -- 扩大长度避免截断
    ) + ' MB') AS database_size,
    -- 计算未分配空间（数据文件总大小 - 已分配空间）
    LTRIM(STR(
        CASE WHEN data_file_size >= allocated_pages THEN
            (CONVERT(DECIMAL(18, 2), data_file_size) - CONVERT(DECIMAL(18, 2), allocated_pages))
            * 8192 / 1048576
        ELSE 0
        END,
        18, 2
    ) + ' MB') AS unallocated_space
FROM (
    -- 子查询1：计算数据文件和日志文件总大小（页数量）
    SELECT
        SUM(CASE WHEN status & 64 = 0 THEN size ELSE 0 END) AS data_file_size,  -- 数据文件（排除日志文件）
        SUM(CASE WHEN status & 64 <> 0 THEN size ELSE 0 END) AS log_file_size   -- 日志文件
    FROM sys.sysfiles
) AS file_sizes,
(
    -- 子查询2：计算已分配的总页数
    SELECT SUM(total_pages) AS allocated_pages
    FROM sys.allocation_units
) AS allocation_stats;
