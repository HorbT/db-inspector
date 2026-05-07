SELECT CON_ID,
       PDBNAME,
       TS#,
       TS_NAME,
	   type,
       TS_SIZE_M,
       FREE_SIZE_M,
       USED_SIZE_M,
       USED_PER,
       MAX_SIZE_G,
       USED_PER_MAX,
       BLOCK_SIZE,
       LOGGING,
       TS_DF_COUNT
FROM   (WITH wt1 AS (SELECT ts.CON_ID,
                            (SELECT np.NAME
                             FROM   V$CONTAINERS np
                             WHERE  np.CON_ID = tS.con_id) PDBNAME,
                            (SELECT A.TS#
                             FROM   V$TABLESPACE A
                             WHERE  A.NAME = UPPER(tS.TABLESPACE_NAME)
                             AND    a.CON_ID = tS.con_id) TS#,
                            ts.TABLESPACE_NAME,
                            df.all_bytes,
                            decode(df.TYPE,
                                   'D',
                                   nvl(fs.FREESIZ, 0),
                                   'T',
                                   df.all_bytes - nvl(fs.FREESIZ, 0)) FREESIZ,
                            df.MAXSIZ,
                            ts.BLOCK_SIZE,
                            ts.LOGGING,
                            ts.FORCE_LOGGING,
                            ts.CONTENTS,
                            ts.EXTENT_MANAGEMENT,
                            ts.SEGMENT_SPACE_MANAGEMENT,
                            ts.RETENTION,
                            ts.DEF_TAB_COMPRESSION,
                            df.ts_df_count
                     FROM   cdb_tablespaces ts,
                            (SELECT d.CON_ID,
                                    'D' TYPE,
                                    TABLESPACE_NAME,
                                    COUNT(*) ts_df_count,
                                    SUM(BYTES) all_bytes,
                                    SUM(decode(MAXBYTES, 0, BYTES, MAXBYTES)) MAXSIZ
                             FROM   cdb_data_files d
                             GROUP  BY d.CON_ID,
                                       TABLESPACE_NAME
                             UNION ALL
                             SELECT d.CON_ID,
                                    'T',
                                    TABLESPACE_NAME,
                                    COUNT(*) ts_df_count,
                                    SUM(BYTES) all_bytes,
                                    SUM(decode(MAXBYTES, 0, BYTES, MAXBYTES))
                             FROM   cdb_temp_files d
                             GROUP  BY d.CON_ID,
                                       TABLESPACE_NAME) df,
                            (SELECT d.CON_ID,
                                    TABLESPACE_NAME,
                                    SUM(BYTES) FREESIZ
                             FROM   cdb_free_space d
                             GROUP  BY d.CON_ID,
                                       TABLESPACE_NAME
                             UNION ALL
                             SELECT d.CON_ID,
                                    tablespace_name,
                                    SUM(d.BLOCK_SIZE * a.BLOCKS) bytes
                             FROM   gv$sort_usage   a,
                                    cdb_tablespaces d
                             WHERE  a.tablespace = d.tablespace_name
                             AND    a.CON_ID = d.CON_ID
                             GROUP  BY d.CON_ID,
                                       tablespace_name) fs
                     WHERE  ts.TABLESPACE_NAME = df.TABLESPACE_NAME
                     AND    ts.CON_ID = df.CON_ID
                     AND    ts.TABLESPACE_NAME = fs.TABLESPACE_NAME(+)
                     AND    ts.CON_ID = fs.CON_ID(+))
           SELECT T.CON_ID,
                  (CASE
                      WHEN T.PDBNAME = LAG(T.PDBNAME, 1)
                       OVER(PARTITION BY T.PDBNAME ORDER BY TS#) THEN
                       NULL
                      ELSE
                       T.PDBNAME
                  END) PDBNAME,
                  TS#,
                  t.TABLESPACE_NAME TS_Name,
          t.CONTENTS type,
                  round(t.all_bytes / 1024 / 1024) ts_size_M,
                  round(t.freesiz / 1024 / 1024) Free_Size_M,
                  round((t.all_bytes - t.FREESIZ) / 1024 / 1024) Used_Size_M,
                  round((t.all_bytes - t.FREESIZ) * 100 / t.all_bytes, 3) Used_per,
                  round(MAXSIZ / 1024 / 1024 / 1024, 3) MAX_Size_g,
                  round(decode(MAXSIZ,
                               0,
                               to_number(NULL),
                               (t.all_bytes - FREESIZ)) * 100 / MAXSIZ,
                        3) USED_per_MAX,
                  round(t.BLOCK_SIZE) BLOCK_SIZE,
                  t.LOGGING,
                  t.ts_df_count
           FROM   wt1 t
           UNION ALL
           SELECT DISTINCT T.CON_ID,
                  '' PDBNAME,
                  to_number('') TS#,
                  'ALL TS:' TS_Name,
          '' type,
                  round(SUM(t.all_bytes) / 1024 / 1024, 3) ts_size_M,
                  round(SUM(t.freesiz) / 1024 / 1024) Free_Size_m,
                  round(SUM(t.all_bytes - t.FREESIZ) / 1024 / 1024) Used_Size_M,
                  round(SUM(t.all_bytes - t.FREESIZ) * 100 /
                        SUM(t.all_bytes),
                        3) Used_per,
                  round(SUM(MAXSIZ) / 1024 / 1024 / 1024) MAX_Size,
                  to_number('') "USED,% of MAX Size",
                  to_number('') BLOCK_SIZE,
                  '' LOGGING,
                  to_number('') ts_df_count
           FROM   wt1 t
           GROUP  BY rollup(CON_ID,PDBNAME)
)  
ORDER  BY CON_ID,type,TS# ;