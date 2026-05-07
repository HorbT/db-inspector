SELECT d.CON_ID,
       DECODE(broken, 'Y', job, job) 作业ID,
       DECODE(broken, 'Y', log_user, log_user) 用户,
       DECODE(broken, 'Y', what, what) 作业内容,
       DECODE(broken,
              'Y',
              NVL(TO_CHAR(next_date, 'yyyy-mm-dd HH24:MI:SS'), ''),
              NVL(TO_CHAR(next_date, 'yyyy-mm-dd HH24:MI:SS'), '')) 下一次运行时间,
       DECODE(broken, 'Y', interval, interval) 间隔,
       DECODE(broken,
              'Y',
              NVL(TO_CHAR(last_date, 'yyyy-mm-dd HH24:MI:SS'), ''),
              NVL(TO_CHAR(last_date, 'yyyy-mm-dd HH24:MI:SS'), '')) 上一次运行时间,
       DECODE(broken, 'Y', NVL(failures, 0), NVL(failures, 0)) 失败次数,
       DECODE(broken, 'Y', broken, broken) 是否损坏
  FROM cdb_jobs d
 ORDER BY d.CON_ID, d.broken, d.JOB;
