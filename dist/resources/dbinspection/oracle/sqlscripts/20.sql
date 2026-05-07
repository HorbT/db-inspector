SELECT DISTINCT *
  FROM (SELECT TAG,
	             BS_KEY,
               BP_KEY,
               BACKUP_TYPE,
               INCREMENTAL_LEVEL,
               bs_size_M,
               START_TIME,
               END_TIME,
               ELAPSED_TIME,
               PIECE_NAME,
               DEVICE_TYPE,
               BS_STATUS,
               BS_COMPRESSED,
               CONTROLFILE_INCLUDED,
               KEEP,
               KEEP_UNTIL,
               KEEP_OPTIONS,
               FILE#,
               DF_INCREMENTAL_LEVEL,
               DATAFILENAME,
               USED_CHANGE_TRACKING,
               DF_CHECKPOINT_CHANGE#,
               DF_CHECKPOINT_TIME,
							 con_id,
               DENSE_RANK() OVER(PARTITION BY BACKUP_TYPE ORDER BY SUBSTR(START_TIME,1,10) DESC) RANK_ORDER
          FROM (SELECT a.RECID BS_key,
       c.RECID BP_key,
       case
         WHEN a.backup_type = 'L' then
          '<div nowrap><font color="#990000">Archived Redo Logs</font></div>'
         WHEN a.backup_type = 'D' AND  a.INCREMENTAL_LEVEL is null then
          '<div nowrap><font color="#000099">Datafile Full Backup</font></div>'
         WHEN a.backup_type = 'I' or a.INCREMENTAL_LEVEL IS NOT NULL then
          '<div nowrap><font color="darkgreen">Incremental Backup</font></div>'
       end backup_type,
       case
         WHEN a.backup_type = 'L' then
          'Archived Redo Logs'
         WHEN a.backup_type = 'D' AND  a.INCREMENTAL_LEVEL is null then
          'Datafile Full Backup'
         WHEN a.backup_type = 'I' or a.INCREMENTAL_LEVEL IS NOT NULL then
          'Incremental Backup'
       end backup_type1,
       a.INCREMENTAL_LEVEL,
       round(aa.bs_bytes/1024/1024, 2) bs_size_M,
       TO_CHAR(a.START_TIME, 'YYYY-MM-DD HH24:MI:SS') START_TIME,
       TO_CHAR(a.COMPLETION_TIME, 'YYYY-MM-DD HH24:MI:SS') END_TIME,
       (round(a.ELAPSED_SECONDS)) ELAPSED_TIME,
       c.HANDLE piece_name,
       c.DEVICE_TYPE,
       c.TAG,
       aa.bs_status,
       aa.bs_compressed,
       a.CONTROLFILE_INCLUDED,
       a.KEEP,
       a.KEEP_UNTIL,
       a.KEEP_OPTIONS,
       ------ data file --------
       b.FILE#,
       (SELECT nb.NAME FROM v$datafile nb WHERE nb.FILE# = b.FILE#) datafileNAME,
       b.INCREMENTAL_LEVEL df_INCREMENTAL_LEVEL,
       b.USED_CHANGE_TRACKING,
       b.CHECKPOINT_CHANGE#||'' df_CHECKPOINT_CHANGE#,
       b.CHECKPOINT_TIME df_CHECKPOINT_TIME,
			 a.con_id
  FROM v$backup_set a
  LEFT OUTER JOIN v$backup_files aa
    on (aa.bs_key = a.RECID AND  aa.file_type = 'PIECE'  and a.CON_ID=aa.con_id)
  LEFT OUTER JOIN v$backup_datafile b
    ON (a.SET_STAMP = b.SET_STAMP AND  a.SET_COUNT = b.SET_COUNT and a.CON_ID=b.con_id)
  LEFT OUTER JOIN v$backup_piece c
    ON (a.SET_STAMP = c.SET_STAMP AND  a.SET_COUNT = c.SET_COUNT and a.CON_ID=c.con_id)
  WHERE a.START_TIME>=SYSDATE - 15
    AND A.BACKUP_TYPE<>'L'
		and file#>0 )) A
 WHERE A.RANK_ORDER <= 7
 ORDER BY  substr(start_time,1,10) desc,A.BS_KEY, A.BP_KEY, A.FILE#;