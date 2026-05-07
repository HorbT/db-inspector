SELECT
  '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +

  -- 1. CPU 使用率卡片
  '<div>' +
    '<h5 class="text-sm font-medium text-gray-600 mb-2">CPU使用率</h5>' +
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' +
      '<div class="bg-primary h-4 rounded-full" style="width: ' +
      -- 核心修复：将数值转为字符串
      CAST(ROUND(cpu_busy/total_time * 100, 2) AS VARCHAR(20)) +
      '%"></div>' +
    '</div>' +
    '<div class="flex justify-between text-xs text-gray-500">' +
      '<span>当前: ' +
      CAST(ROUND(cpu_busy/total_time * 100, 2) AS VARCHAR(20)) +
      '%</span>' +
    '</div>' +
  '</div>' +

  -- 2. 内存使用率卡片
  '<div>' +
    '<h5 class="text-sm font-medium text-gray-600 mb-2">内存使用率</h5>' +
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' +
      '<div class="bg-secondary h-4 rounded-full" style="width: ' +
      CAST(ROUND(used_mem*1.0/target_mem * 100, 2) AS VARCHAR(20)) +
      '%"></div>' +
    '</div>' +
    '<div class="flex justify-between text-xs text-gray-500">' +
      '<span>当前: ' +
      CAST(ROUND(used_mem*1.0/target_mem * 100, 2) AS VARCHAR(20)) +
      '%</span>' +
    '</div>' +
  '</div>' +

  -- 3. 磁盘使用率卡片
  '<div>' +
    '<h5 class="text-sm font-medium text-gray-600 mb-2">磁盘使用率</h5>' +
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' +
      '<div class="bg-accent h-4 rounded-full" style="width: ' +
      CAST(ROUND(100 - disk_usage, 2) AS VARCHAR(20)) +
      '%"></div>' +
    '</div>' +
    '<div class="flex justify-between text-xs text-gray-500">' +
      '<span>当前: ' +
      CAST(ROUND(100 - disk_usage, 2) AS VARCHAR(20)) +
      '%</span>' +
    '</div>' +
  '</div>' +

  -- 4. IO 使用率卡片
  '<div>' +
    '<h5 class="text-sm font-medium text-gray-600 mb-2">IO使用率</h5>' +
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' +
      '<div class="bg-success h-4 rounded-full" style="width: ' +
      CAST(ROUND(io_busy/total_time * 100, 2) AS VARCHAR(20)) +
      '%"></div>' +
    '</div>' +
    '<div class="flex justify-between text-xs text-gray-500">' +
      '<span>当前: ' +
      CAST(ROUND(io_busy/total_time * 100, 2) AS VARCHAR(20)) +
      '%</span>' +
    '</div>' +
  '</div>' +
  '</div>' AS "系统资源监控面板"
FROM (
  -- 主子查询：整合所有指标
  SELECT
    -- CPU 和 IO 相关指标
    CAST(@@cpu_busy AS FLOAT) AS cpu_busy,
    CAST(@@io_busy AS FLOAT) AS io_busy,
    CAST(@@idle AS FLOAT) AS idle,
    (CAST(@@cpu_busy AS FLOAT) + CAST(@@io_busy AS FLOAT) + CAST(@@idle AS FLOAT)) AS total_time,

    -- 内存相关指标
    (SELECT cntr_value FROM sysperfinfo
     WHERE counter_name = 'Used memory (KB)' AND instance_name = 'default') AS used_mem,
    (SELECT cntr_value FROM sysperfinfo
     WHERE counter_name = 'Target memory (KB)' AND instance_name = 'default') AS target_mem,

    -- 磁盘相关指标（原查询返回的是空闲率）
    (SELECT TOP 1 CAST(CAST(vs.available_bytes AS FLOAT) / CAST(vs.total_bytes AS FLOAT) AS DECIMAL(18, 2)) * 100
     FROM sys.master_files AS f WITH (NOLOCK)
     CROSS APPLY sys.dm_os_volume_stats(f.database_id, f.[file_id]) AS vs) AS disk_usage
) AS metrics;
