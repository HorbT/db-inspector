SELECT
    -- 数据空间（MB）：对应 sp_spaceused 中的 data
    ROUND(SUM(
        CASE
            -- 排除 XML 索引、全文索引等内部表的数据页
            WHEN it.internal_type IN (202,204,207,211,212,213,214,215,216,221,222,236) THEN 0
            -- 非行内数据且为聚集索引/堆表时，计为已用页
            WHEN a.type <> 1 AND p.index_id < 2 THEN a.used_pages
            -- 聚集索引/堆表的行内数据页
            WHEN p.index_id < 2 THEN a.data_pages
            ELSE 0
        END
    ) * 8192.0 / 1024 / 1024, 2) AS data_mb,  -- 转换为 MB（8192字节/页 → KB → MB）

    -- 索引空间（MB）：对应 sp_spaceused 中的 index_size
    ROUND((SUM(a.used_pages) - SUM(
        CASE
            WHEN it.internal_type IN (202,204,207,211,212,213,214,215,216,221,222,236) THEN 0
            WHEN a.type <> 1 AND p.index_id < 2 THEN a.used_pages
            WHEN p.index_id < 2 THEN a.data_pages
            ELSE 0
        END
    )) * 8192.0 / 1024 / 1024, 2) AS index_size_mb,

    -- 未使用空间（MB）：对应 sp_spaceused 中的 unused
    ROUND((SUM(a.total_pages) - SUM(a.used_pages)) * 8192.0 / 1024 / 1024, 2) AS unused_mb
FROM sys.partitions p
JOIN sys.allocation_units a
    ON p.partition_id = a.container_id
    AND (a.type = 1 OR a.type = 3)  -- 仅包含行内数据（1）和行溢出数据（3）的分配单元
LEFT JOIN sys.internal_tables it
    ON p.object_id = it.object_id;  -- 关联内部表用于过滤特殊索引类型