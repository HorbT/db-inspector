SELECT GROUP#,
       DBID db_id,
       THREAD#,
       SEQUENCE#,
       BYTES,
       USED,
       ARCHIVED,
       STATUS,
       FIRST_CHANGE#,
       NEXT_CHANGE#,
       LAST_CHANGE#
  FROM Gv$standby_log;