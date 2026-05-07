SELECT
        '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">' +
        -- 预留大小卡片（蓝色）
        '<div class="bg-blue-50 rounded-lg p-4 border border-blue-100">' +
            '<div class="text-sm text-blue-500 font-medium mb-1">预留大小</div>' +
            '<div class="text-2xl font-bold text-blue-700">' + 
                -- 先转DECIMAL，再强制转为字符串（指定长度避免截断）
                CONVERT(VARCHAR(50), CAST(SUM(p.reserved_page_count * 8.0 / 1024 / 1024) AS DECIMAL(38, 2))) + ' GB' + 
            '</div>' +
        '</div>' +
        -- 数据大小卡片（绿色）
        '<div class="bg-green-50 rounded-lg p-4 border border-green-100">' +
            '<div class="text-sm text-green-500 font-medium mb-1">数据大小</div>' +
            '<div class="text-2xl font-bold text-green-700">' + 
                CONVERT(VARCHAR(50), CAST(SUM(CASE WHEN i.type IN (0, 1) THEN p.used_page_count * 8.0 / 1024 / 1024 ELSE 0 END) AS DECIMAL(38, 2))) + ' GB' + 
            '</div>' +
        '</div>' +
        -- 索引大小卡片（黄色）
        '<div class="bg-yellow-50 rounded-lg p-4 border border-yellow-100">' +
            '<div class="text-sm text-yellow-500 font-medium mb-1">索引大小</div>' +
            '<div class="text-2xl font-bold text-yellow-700">' + 
                CONVERT(VARCHAR(50), CAST(SUM(CASE WHEN i.type = 2 THEN p.used_page_count * 8.0 / 1024 / 1024 ELSE 0 END) AS DECIMAL(38, 2))) + ' GB' + 
            '</div>' +
        '</div>' +
    '</div>'
FROM
    sys.tables t
JOIN
    sys.indexes i ON t.object_id = i.object_id
JOIN
    sys.dm_db_partition_stats p ON i.object_id = p.object_id AND i.index_id = p.index_id
WHERE
    t.type = 'U'; -- 只统计用户表
