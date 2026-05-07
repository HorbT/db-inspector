SELECT top 10
    f.name AS FileName,
    (fs.total_page_count / 8) AS TotalExtents
FROM
    sys.dm_db_file_space_usage fs  -- 数据文件空间使用统计
JOIN
    sys.database_files f ON fs.file_id = f.file_id  -- 数据文件基本信息
JOIN
    sys.data_spaces ds ON f.data_space_id = ds.data_space_id  -- 文件组信息
where fs.allocated_extent_page_count > 10
ORDER BY
    fs.total_page_count desc;