SELECT 
  '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' ||
  
  -- 1. CPU 使用率卡片
  '<div>' ||
    '<h5 class="text-sm font-medium text-gray-600 mb-2">CPU使用率</h5>' ||
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' ||
      '<div class="bg-primary h-4 rounded-full" style="width: ' || 
      ROUND(
        CASE WHEN (busy + idle + iowait) = 0 THEN 0 
             ELSE (busy / (busy + idle + iowait)) * 100 
        END, 2
      ) || '%"></div>' ||
    '</div>' ||
    '<div class="flex justify-between text-xs text-gray-500">' ||
      '<span>当前: ' || 
      ROUND(
        CASE WHEN (busy + idle + iowait) = 0 THEN 0 
             ELSE (busy / (busy + idle + iowait)) * 100 
        END, 2
      ) || '%</span>' ||
    '</div>' ||
  '</div>' ||
  
  -- 2. 内存使用率卡片
  '<div>' ||
    '<h5 class="text-sm font-medium text-gray-600 mb-2">内存使用率</h5>' ||
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' ||
      '<div class="bg-secondary h-4 rounded-full" style="width: ' || 
      ROUND(
        CASE WHEN phys_mem = 0 THEN 0 
             ELSE ((phys_mem - free_mem) / phys_mem) * 100 
        END, 2
      ) || '%"></div>' ||
    '</div>' ||
    '<div class="flex justify-between text-xs text-gray-500">' ||
      '<span>当前: ' || 
      ROUND(
        CASE WHEN phys_mem = 0 THEN 0 
             ELSE ((phys_mem - free_mem) / phys_mem) * 100 
        END, 2
      ) || '%</span>' ||
    '</div>' ||
  '</div>' ||
  
  -- 3. IO 等待率卡片（磁盘 I/O 使用率）
  '<div>' ||
    '<h5 class="text-sm font-medium text-gray-600 mb-2">磁盘I/O等待率</h5>' ||
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' ||
      '<div class="bg-accent h-4 rounded-full" style="width: ' || 
      ROUND(
        CASE WHEN (busy + idle + iowait) = 0 THEN 0 
             ELSE (iowait / (busy + idle + iowait)) * 100 
        END, 2
      ) || '%"></div>' ||
    '</div>' ||
    '<div class="flex justify-between text-xs text-gray-500">' ||
      '<span>当前: ' || 
      ROUND(
        CASE WHEN (busy + idle + iowait) = 0 THEN 0 
             ELSE (iowait / (busy + idle + iowait)) * 100 
        END, 2
      ) || '%</span>' ||
    '</div>' ||
  '</div>' ||
  
  -- 4. 系统负载卡片（基于 LOAD 指标）
  '<div>' ||
    '<h5 class="text-sm font-medium text-gray-600 mb-2">系统负载</h5>' ||
    '<div class="bg-gray-200 rounded-full h-4 mb-1">' ||
      '<div class="bg-success h-4 rounded-full" style="width: ' || 
      ROUND(
        CASE WHEN num_cpus = 0 THEN 0 
             ELSE (load / num_cpus) * 100 
        END, 2
      ) || '%"></div>' ||
    '</div>' ||
    '<div class="flex justify-between text-xs text-gray-500">' ||
      '<span>当前: ' || 
      ROUND(
        CASE WHEN num_cpus = 0 THEN 0 
             ELSE (load / num_cpus) 
        END, 2
      ) || '</span>' ||
    '</div>' ||
  '</div>' ||
  
  '</div>' AS " "
FROM (
  -- 子查询：从 v$osstat 提取关键指标（替换RRSC为LOAD）
  SELECT 
    MAX(CASE WHEN stat_name = 'NUM_CPUS'          THEN value END) AS num_cpus,
    MAX(CASE WHEN stat_name = 'IDLE_TIME'         THEN value END) AS idle,    -- 空闲时间（百分之一秒）
    MAX(CASE WHEN stat_name = 'BUSY_TIME'         THEN value END) AS busy,    -- 忙碌时间（百分之一秒）
    MAX(CASE WHEN stat_name = 'IOWAIT_TIME'       THEN value END) AS iowait,  -- IO 等待时间（百分之一秒）
    MAX(CASE WHEN stat_name = 'PHYSICAL_MEMORY_BYTES' THEN value END) AS phys_mem, -- 总内存（字节）
    MAX(CASE WHEN stat_name = 'FREE_MEMORY_BYTES' THEN value END) AS free_mem, -- 空闲内存（字节）
    MAX(CASE WHEN stat_name = 'LOAD'              THEN value END) AS load     -- 系统负载（替换原RRSC）
  FROM v$osstat
);
