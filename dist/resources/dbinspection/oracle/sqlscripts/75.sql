SELECT *
  FROM (SELECT a.CON_ID,
               --a.CONTAINER_NAME,
               to_char(originating_timestamp, 'YYYY-MM-DD HH24:MI:SS') alert_date,
               message_text,
               --a.ADR_HOME,
               a.HOST_ID,
               a.HOST_ADDRESS,
               a.PROCESS_ID,
               a.RECORD_ID,
               a.FILENAME,
               DENSE_RANK() OVER(PARTITION BY a.CON_ID ORDER BY a.RECORD_ID DESC) RN
          from v$diag_alert_ext a
         where trim(a.COMPONENT_ID) = 'rdbms'
           AND A.FILENAME =
               (SELECT D.VALUE ||
                       (SELECT CASE
                                 WHEN D.PLATFORM_NAME LIKE '%Microsoft%' THEN
                                  CHR(92)
                                 ELSE
                                  CHR(47)
                               END PLATFORM
                          FROM V$DATABASE D) || 'log.xml'
                  FROM V$DIAG_INFO D
                 WHERE D.NAME = 'Diag Alert')
           and originating_timestamp >= sysdate - 7
           and trim(a.MESSAGE_TEXT) IS NOT NULL)
 where rn <= 200
 order by record_id;