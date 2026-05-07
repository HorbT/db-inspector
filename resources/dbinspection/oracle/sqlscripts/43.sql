select a.DATABASE_MODE, a.RECOVERY_MODE
  from v$archive_dest_status a
 where a.DATABASE_MODE <> 'UNKNOWN'
   and SRL = (SELECT CASE
                       WHEN NB.DATABASE_ROLE like '%STANDBY%' then
                        'NO'
                       ELSE
                        'YES'
                     END
                FROM V$DATABASE NB);