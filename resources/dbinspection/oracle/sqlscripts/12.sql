SELECT FILE_ID,
       CON_ID,
       (CASE
           WHEN T.PDBNAME = LAG(T.PDBNAME, 1)
            OVER(PARTITION BY T.PDBNAME ORDER BY TS#) THEN
            NULL
           ELSE
            T.PDBNAME
       END) PDBNAME,
       TS#,
       TABLESPACE_NAME,
	   CONTENTS,
       TS_SIZE_M,
       FILE_NAME,
       FILE_SIZE_M,
       FILE_MAX_SIZE_G,
       AUTOEXTENSIBLE,
       INCREMENT_M,
       AUTOEXTEND_RATIO,
       CREATION_TIME,
       INCREMENT_BY_BLOCK,
       BYTES,
       BLOCKS,
       MAXBYTES,
       MAXBLOCKS,
       USER_BYTES,
       USER_BLOCKS
FROM   (SELECT D.FILE_ID,
               D.CON_ID,
               (SELECT NP.NAME
                FROM   V$CONTAINERS NP
                WHERE  NP.CON_ID = D.CON_ID) PDBNAME,
               (SELECT A.TS#
                FROM   V$TABLESPACE A
                WHERE  A.NAME = UPPER(D.TABLESPACE_NAME)
                AND    A.CON_ID = D.CON_ID) TS#,
               D.TABLESPACE_NAME,
			   (select CONTENTS from cdb_tablespaces where TABLESPACE_NAME=d.TABLESPACE_NAME and CON_ID = D.CON_ID) CONTENTS,
               (SELECT ROUND(SUM(NB.BYTES) / 1024 / 1024, 2)
                FROM   CDB_DATA_FILES NB
                WHERE  NB.TABLESPACE_NAME = D.TABLESPACE_NAME
                AND    NB.CON_ID = D.CON_ID) TS_SIZE_M,
               D.FILE_NAME,
               ROUND(D.BYTES / 1024 / 1024, 2) FILE_SIZE_M,
               ROUND(D.MAXBYTES / 1024 / 1024 / 1024, 2) FILE_MAX_SIZE_G,
               D.AUTOEXTENSIBLE,
               ROUND(D.INCREMENT_BY * 8 * 1024 / 1024 / 1024, 2) INCREMENT_M,
               ROUND(D.BYTES * 100 /
                     DECODE(D.MAXBYTES, 0, BYTES, D.MAXBYTES),
                     2) AUTOEXTEND_RATIO,
               (SELECT B.CREATION_TIME
                FROM   SYS.V_$DATAFILE B
                WHERE  B.FILE# = D.FILE_ID
                AND    B.CON_ID = D.CON_ID) CREATION_TIME,
               D.INCREMENT_BY INCREMENT_BY_BLOCK,
               D.BYTES,
               D.BLOCKS,
               D.MAXBYTES,
               D.MAXBLOCKS,
               D.USER_BYTES,
               D.USER_BLOCKS
        FROM   CDB_DATA_FILES D
        UNION ALL
        SELECT D.FILE_ID,
               D.CON_ID,
               (SELECT NP.NAME
                FROM   V$CONTAINERS NP
                WHERE  NP.CON_ID = D.CON_ID) PDBNAME,
               (SELECT A.TS#
                FROM   V$TABLESPACE A
                WHERE  A.NAME = UPPER(D.TABLESPACE_NAME)
                AND    A.CON_ID = D.CON_ID) TS#,
               D.TABLESPACE_NAME,
			   (select CONTENTS from cdb_tablespaces where TABLESPACE_NAME=d.TABLESPACE_NAME and CON_ID = D.CON_ID) CONTENTS,
               (SELECT ROUND(SUM(NB.BYTES) / 1024 / 1024, 2)
                FROM   V$TEMPFILE NB
                WHERE  NB.NAME = D.FILE_NAME
                AND    NB.CON_ID = D.CON_ID) TS_SIZE,
               D.FILE_NAME,
               ROUND(D.BYTES / 1024 / 1024, 2) FILE_SIZE_M,
               ROUND(D.MAXBYTES / 1024 / 1024 / 1024, 2) FILE_MAX_SIZE_G,
               D.AUTOEXTENSIBLE,
               ROUND(D.INCREMENT_BY * 8 * 1024 / 1024 / 1024, 2) INCREMENT_M,
               ROUND(D.BYTES * 100 /
                     DECODE(D.MAXBYTES, 0, BYTES, D.MAXBYTES),
                     2) AUTOEXTEND_RATIO,
               (SELECT B.CREATION_TIME
                FROM   SYS.V_$DATAFILE B
                WHERE  B.FILE# = D.FILE_ID
                AND    B.CON_ID = D.CON_ID) CREATION_TIME,
               D.INCREMENT_BY INCREMENT_BY_BLOCK,
               D.BYTES,
               D.BLOCKS,
               D.MAXBYTES,
               D.MAXBLOCKS,
               D.USER_BYTES,
               D.USER_BLOCKS
        FROM   CDB_TEMP_FILES D)  T
ORDER  BY CON_ID,CONTENTS,FILE_ID,TS#;