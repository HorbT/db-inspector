SELECT * FROM (
SELECT t.THREAD#,
       t.SEQUENCE#,
       t.FIRST_TIME,
       nvl(T.END_TIME,
           (SELECT NB.FIRST_TIME
              FROM v$log nb
             WHERE nb.SEQUENCE# = t.SEQUENCE# + 1
               AND  nb.THREAD# = t.THREAD#)) END_TIME,
       round(((nvl(T.END_TIME,
                   (SELECT NB.FIRST_TIME
                      FROM v$log nb
                     WHERE nb.SEQUENCE# = t.SEQUENCE# + 1
                       AND  nb.THREAD# = t.THREAD#)) - t.FIRST_TIME) * 24) * 60,
             2) total_min,
       ROUND(t.BLOCKS * t.BLOCK_SIZE / 1024 / 1024, 3) LOGsize_m,
       t.NAME,
       '<div align="center">' || archived || '</div>' archived,
       '<div align="center">' || applied || '</div>' applied,
       '<div align="center">' || deleted || '</div>' deleted,
       DECODE(status,
              'A',
              '<div align="center"><b><font color="darkgreen">Available</font></b></div>',
              'D',
              '<div align="center"><b><font color="#663300">Deleted</font></b></div>',
              'U',
              '<div align="center"><b><font color="#990000">Unavailable</font></b></div>',
              'X',
              '<div align="center"><b><font color="#990000">Expired</font></b></div>') status
  FROM (SELECT a.THREAD#,
               a.SEQUENCE#,
               a.FIRST_TIME,
               a.BLOCKS,
               a.BLOCK_SIZE,
               a.NAME,
               a.ARCHIVED,
               a.APPLIED,
               a.DELETED,
               a.STATUS,
               lead(a.FIRST_TIME) over(partition by a.THREAD# ORDER BY a.SEQUENCE#) END_TIME
          FROM v$archived_log a
         WHERE a.STANDBY_DEST='NO'  AND  a.FIRST_TIME >= SYSDATE - 7
           AND  a.FIRST_TIME <= SYSDATE) t
 ORDER BY t.THREAD#, t.SEQUENCE# DESC) WHERE rownum<=500;