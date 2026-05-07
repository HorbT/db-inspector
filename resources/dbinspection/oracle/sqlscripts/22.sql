SELECT '<div align="center"><font color="#336699"><b>' || BS.RECID ||
       '</b></font></div>' BS_KEY,
       PIECE# PIECE#,
       COPY# COPY#,
       BS.RECID BP_KEY,
       TO_CHAR(BS.START_TIME, 'YYYY-MM-DD HH24:MI:SS') START_TIME,
       TO_CHAR(BS.COMPLETION_TIME, 'YYYY-MM-DD HH24:MI:SS') END_TIME,
       (round(BS.ELAPSED_SECONDS)) ELAPSED_TIME,
       BP.HANDLE piece_name,
       DEVICE_TYPE,
       DECODE(BP.STATUS,
              'A',
              '<div nowrap align="center"><font color="darkgreen"><b>Available</b></font></div>',
              'D',
              '<div nowrap align="center"><font color="#000099"><b>Deleted</b></font></div>',
              'X',
              '<div nowrap align="center"><font color="#990000"><b>Expired</b></font></div>') STATUS ,
			F.BYTES
  FROM V$BACKUP_SET BS
  LEFT OUTER JOIN V$BACKUP_PIECE BP
   ON (BS.SET_STAMP = BP.SET_STAMP AND  BS.SET_COUNT = BP.SET_COUNT)
  LEFT OUTER JOIN v$backup_spfile f
  ON  (bs.SET_STAMP = F.SET_STAMP AND  BS.SET_COUNT = F.SET_COUNT)
 WHERE  BS.CONTROLFILE_INCLUDED = 'YES'
   AND BS.START_TIME >= SYSDATE - 15
	 AND F.BYTES IS NOT NULL
 ORDER BY substr(start_time,1,10) desc,BS.RECID , PIECE#;