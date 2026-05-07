SELECT
    CONCAT(
        -- 核心布局容器：移动端1列、中屏2列、大屏4列，保证4个卡片均匀分布
        '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">',
        -- 1. 总实例大小卡片（蓝色系，样式统一）
        '<div class="bg-blue-50 rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-200">',
            '<div class="text-sm text-blue-500 font-medium mb-2">总实例大小</div>',
            '<div class="text-2xl font-bold text-blue-800">', ROUND(total_instance_size_gb, 1), ' GB</div>',
        '</div>',
        -- 2. 表总大小卡片（绿色系）
        '<div class="bg-green-50 rounded-xl p-5 border border-green-100 shadow-sm hover:shadow-md transition-shadow duration-200">',
            '<div class="text-sm text-green-500 font-medium mb-2">表总大小</div>',
            '<div class="text-2xl font-bold text-green-800">', ROUND(total_table_size_gb, 1), ' GB</div>',
        '</div>',
        -- 3. 索引总大小卡片（黄色/琥珀色系）
        '<div class="bg-amber-50 rounded-xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow duration-200">',
            '<div class="text-sm text-amber-500 font-medium mb-2">索引总大小</div>',
            '<div class="text-2xl font-bold text-amber-800">', ROUND(total_index_size_gb, 1), ' GB</div>',
        '</div>',
        -- 4. 总行数卡片（红色/玫瑰色系，修正原样式错误）
        '<div class="bg-rose-50 rounded-xl p-5 border border-rose-100 shadow-sm hover:shadow-md transition-shadow duration-200">',
            '<div class="text-sm text-rose-500 font-medium mb-2">总行数</div>',
            '<div class="text-2xl font-bold text-rose-800">', FORMAT(total_table_rows, 0), ' 行</div>',
        '</div>',
        '</div>'
    ) AS "存储与行数统计"
FROM (
    -- 基础统计查询：计算TiDB实例各部分存储大小（单位：GB）
    SELECT
        SUM(data_length + index_length) / 1024 / 1024 / 1024 AS total_instance_size_gb,  -- 实例总大小（数据+索引）
        SUM(data_length) / 1024 / 1024 / 1024 AS total_table_size_gb,                  -- 表数据总大小
        SUM(index_length) / 1024 / 1024 / 1024 AS total_index_size_gb,                   -- 索引总大小
        SUM(TABLE_ROWS) AS total_table_rows
    FROM
        information_schema.TABLES  -- TiDB 存储表元数据的系统表
    WHERE
        TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys') -- 排除系统库，统计业务库
) a;