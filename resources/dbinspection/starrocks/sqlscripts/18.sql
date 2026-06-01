SELECT 
  JOB_ID,
  LABEL,
  CREATE_TIME,
  STATE,
  ERROR_MSG
FROM information_schema.loads
WHERE STATE != 'FINISHED' AND CREATE_TIME >= date_sub(current_date(),INTERVAL 1 day)
LIMIT 20;