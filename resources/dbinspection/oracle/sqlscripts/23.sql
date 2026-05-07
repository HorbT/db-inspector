SELECT * FROM
(select A.tag,
       a.BS_key,
       A.BP_key,
       backup_type,
       a.INCREMENTAL_LEVEL,
       bs_size_M,
       START_TIME,
       END_TIME,
       ELAPSED_TIME,
       A.piece_name,
       A.DEVICE_TYPE,
       A.bs_status,
       A.bs_compressed,
       count(a.SEQUENCE#) ARCHIVE_SUM
  from (SELECT c.tag,
               a.RECID BS_key,
               c.RECID BP_key,
               case
                 WHEN a.backup_type = 'L' then
                  'Archived Redo Logs'
                 WHEN a.backup_type = 'D' AND a.INCREMENTAL_LEVEL is null then
                  'Datafile Full Backup'
                 WHEN a.backup_type = 'I' or a.INCREMENTAL_LEVEL IS NOT NULL then
                  'Incremental Backup'
               end backup_type,
               a.INCREMENTAL_LEVEL,
               round(aa.bs_bytes / 1024 / 1024, 2) bs_size_M,
               TO_CHAR(a.START_TIME, 'YYYY-MM-DD HH24:MI:SS') START_TIME,
               TO_CHAR(a.COMPLETION_TIME, 'YYYY-MM-DD HH24:MI:SS') END_TIME,
               (round(a.ELAPSED_SECONDS)) ELAPSED_TIME,
               c.HANDLE piece_name,
               c.DEVICE_TYPE,
               aa.bs_status,
               aa.bs_compressed,
               D.SEQUENCE#
          FROM v$backup_set a
          LEFT OUTER JOIN v$backup_files aa
            on (aa.bs_key = a.RECID AND aa.file_type = 'PIECE')
          LEFT OUTER JOIN v$backup_datafile b
            ON (a.SET_STAMP = b.SET_STAMP AND a.SET_COUNT = b.SET_COUNT)
          LEFT OUTER JOIN v$backup_piece c
            ON (a.SET_STAMP = c.SET_STAMP AND a.SET_COUNT = c.SET_COUNT)
          LEFT OUTER JOIN V$backup_Archivelog_Details D
            ON (d.BTYPE_KEY = a.RECID)
         WHERE a.START_TIME >= SYSDATE - 15
           and A.BACKUP_TYPE = 'L') A
 group by A.tag,
          a.BS_key,
          A.BP_key,
          backup_type,
          a.INCREMENTAL_LEVEL,
          bs_size_M,
          START_TIME,
          END_TIME,
          ELAPSED_TIME,
          A.piece_name,
          A.DEVICE_TYPE,
          A.bs_status,
          A.bs_compressed
 ORDER BY substr(start_time, 1, 10) desc ,BS_key, BP_key)
 WHERE rownum<=200;