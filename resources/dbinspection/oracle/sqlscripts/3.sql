SELECT 
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">' ||
    -- 总段大小卡片（蓝色）
    '<div class="bg-blue-50 rounded-lg p-4 border border-blue-100">' ||
        '<div class="text-sm text-blue-500 font-medium mb-1">总段大小</div>' ||
        '<div class="text-2xl font-bold text-blue-700">' || ROUND(total_segment_size_gb, 1) || ' GB</div>' ||
    '</div>' ||
    -- 表总大小卡片（绿色）
    '<div class="bg-green-50 rounded-lg p-4 border border-green-100">' ||
        '<div class="text-sm text-green-500 font-medium mb-1">表总大小</div>' ||
        '<div class="text-2xl font-bold text-green-700">' || ROUND(total_table_size_gb, 1) || ' GB</div>' ||
    '</div>' ||
    -- 索引总大小卡片（黄色）
    '<div class="bg-yellow-50 rounded-lg p-4 border border-yellow-100">' ||
        '<div class="text-sm text-yellow-500 font-medium mb-1">索引总大小</div>' ||
        '<div class="text-2xl font-bold text-yellow-700">' || ROUND(total_index_size_gb, 1) || ' GB</div>' ||
    '</div>' ||
    '</div>' AS " "
FROM (
    -- 基础统计查询
    SELECT 
        SUM(bytes) / 1024 / 1024 / 1024  AS total_segment_size_gb,
        SUM(CASE WHEN segment_type = 'TABLE' THEN bytes ELSE 0 END) / 1024 / 1024 / 1024 AS total_table_size_gb,
        SUM(CASE WHEN segment_type = 'INDEX' THEN bytes ELSE 0 END) / 1024 / 1024 / 1024 AS total_index_size_gb
    FROM 
        dba_segments
);