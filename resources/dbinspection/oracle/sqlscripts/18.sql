SELECT *
  FROM (SELECT n.CON_ID,
               n.OWNER,
               n.log_id,
               n.job_name,
               n.job_class,
               TO_CHAR(n.log_date, 'YYYY-MM-DD HH24:mi:ss') LOG_DATE,
               n.OPERATION,
               n.status,
               jrd.error#,
               jrd.run_duration,
               TO_CHAR(jrd.ACTUAL_START_DATE, 'YYYY-MM-DD HH24:mi:ss') ACTUAL_START_DATE,
               jrd.INSTANCE_ID,
               jrd.SESSION_ID,
               jrd.SLAVE_PID,
               -- n.additional_info log_ADDITIONAL_INFO,
               jrd.ADDITIONAL_INFO detail_ADDITIONAL_INFO,
               DENSE_RANK() over(partition by n.OWNER, n.JOB_NAME ORDER BY n.LOG_ID desc) rank_order
          FROM cdb_scheduler_job_log N, cdb_scheduler_job_run_details jrd
         WHERE n.log_id = jrd.log_id(+)
           and n.CON_ID = jrd.CON_ID(+)
           AND n.STATUS <> 'SUCCEEDED'
           and n.job_name not like 'ORA$AT_OS_OPT_SY%'
           AND n.log_date >= sysdate - 7
         ORDER BY n.log_date DESC)
 WHERE rank_order <= 5;