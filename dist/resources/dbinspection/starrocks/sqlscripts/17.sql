SELECT 
  STATE AS 状态,
  COUNT(*) AS 任务数,
  MIN(CREATE_TIME) AS 最早时间,
  MAX(CREATE_TIME) AS 最晚时间
FROM information_schema.loads
WHERE CREATE_TIME >= date_sub(current_date(),INTERVAL 1 day)
GROUP BY STATE;