SELECT
    CONCAT(
        '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">',
        -- 总实例大小卡片（蓝色）
        '<div class="bg-blue-50 rounded-lg p-4 border border-blue-100">',
            '<div class="text-sm text-blue-500 font-medium mb-1">总实例大小</div>',
            '<div class="text-2xl font-bold text-blue-700">', ROUND(total_instance_size_gb, 1), ' GB</div>',
        '</div>',
        -- 表总大小卡片（绿色）
        '<div class="bg-green-50 rounded-lg p-4 border border-green-100">',
            '<div class="text-sm text-green-500 font-medium mb-1">表总大小</div>',
            '<div class="text-2xl font-bold text-green-700">', ROUND(total_table_size_gb, 1), ' GB</div>',
        '</div>',
        -- 索引总大小卡片（黄色）
        '<div class="bg-yellow-50 rounded-lg p-4 border border-yellow-100">',
            '<div class="text-sm text-yellow-500 font-medium mb-1">索引总大小</div>',
            '<div class="text-2xl font-bold text-yellow-700">', ROUND(total_index_size_gb, 1), ' GB</div>',
        '</div>',
        '</div>'
    ) AS " "
FROM (
    -- 基础统计查询：计算MySQL实例各部分存储大小（单位：GB）
    SELECT
        SUM(data_length + index_length) / 1024 / 1024 / 1024 AS total_instance_size_gb,  -- 实例总大小（数据+索引）
        SUM(data_length) / 1024 / 1024 / 1024 AS total_table_size_gb,                  -- 表数据总大小
        SUM(index_length) / 1024 / 1024 / 1024 AS total_index_size_gb                   -- 索引总大小
    FROM
        information_schema.TABLES  -- MySQL 存储表元数据的系统表
) a;