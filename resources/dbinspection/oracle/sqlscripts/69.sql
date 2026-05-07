SELECT CON_ID, TABLE_OWNER,
       TABLE_NAME,
       INDEX_OWNER,
       INDEX_NAME,
       CREATED,
       INDEX_TYPE,
       INDEX_MB,
       COUNT_INDEX_COLS,
       MIN_DATE,
       MAX_DATE
  FROM (WITH TMP1 AS (SELECT I.CON_ID, I.OWNER INDEX_OWNER,
                             I.TABLE_OWNER,
                             TABLE_NAME,
                             INDEX_NAME,
                             INDEX_TYPE,
                             (SELECT NB.CREATED
                                FROM CDB_OBJECTS NB
                               WHERE NB.OWNER = I.OWNER
                                 AND NB.OBJECT_NAME = I.INDEX_NAME
                                 AND NB.CON_ID=I.CON_ID
                                 AND NB.SUBOBJECT_NAME IS NULL
                                 AND NB.OBJECT_TYPE = 'INDEX') CREATED,
                             ROUND(SUM(S.BYTES) / 1024 / 1024, 2) INDEX_MB,
                             (SELECT COUNT(1)
                                FROM CDB_IND_COLUMNS DIC
                               WHERE DIC.INDEX_NAME = I.INDEX_NAME
                                 AND DIC.TABLE_NAME = I.TABLE_NAME
                                 AND DIC.INDEX_OWNER = I.OWNER
                                 AND DIC.CON_ID=I.CON_ID) COUNT_INDEX_COLS,
                             DENSE_RANK() OVER(ORDER BY SUM(S.BYTES) DESC) RANK_ORDER
                        FROM CDB_SEGMENTS S, CDB_INDEXES I
                       WHERE I.INDEX_NAME = S.SEGMENT_NAME
                       AND S.CON_ID=I.CON_ID
                         AND S.SEGMENT_TYPE LIKE '%INDEX%'
                         AND I.OWNER = S.OWNER
                         AND S.OWNER NOT IN  ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
                       GROUP BY I.CON_ID, I.OWNER,
                                I.TABLE_OWNER,
                                TABLE_NAME,
                                INDEX_NAME,
                                INDEX_TYPE
                      HAVING SUM(S.BYTES) > 1024 * 1024),
   TMP2 AS (SELECT CON_ID, INDEX_OWNER,INDEX_NAME,
       PLAN_OPERATION,
       (SELECT MIN(TO_CHAR(NB.BEGIN_INTERVAL_TIME,
                           'YYYY-MM-DD HH24:MI:SS'))
          FROM CDB_HIST_SNAPSHOT NB
         WHERE NB.SNAP_ID =
               V.MIN_SNAP_ID) MIN_DATE,
       (SELECT MAX(TO_CHAR(NB.END_INTERVAL_TIME,
                           'YYYY-MM-DD HH24:MI:SS'))
          FROM CDB_HIST_SNAPSHOT NB
         WHERE NB.SNAP_ID =
               V.MAX_SNAP_ID) MAX_DATE,
       COUNTS
  FROM (SELECT D.CON_ID, D.OBJECT_OWNER INDEX_OWNER,
               D.OBJECT_NAME INDEX_NAME,
               D.OPERATION || ' ' ||
               D.OPTIONS PLAN_OPERATION,
               MIN(H.SNAP_ID) MIN_SNAP_ID,
               MAX(H.SNAP_ID) MAX_SNAP_ID,
               COUNT(1) COUNTS
          FROM CDB_HIST_SQL_PLAN D,
               CDB_HIST_SQLSTAT  H
         WHERE D.OBJECT_OWNER NOT IN ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
           AND D.OPERATION LIKE '%INDEX%'
           AND D.SQL_ID =H.SQL_ID
       AND D.CON_ID=H.CON_ID
           GROUP BY D.CON_ID, D.OBJECT_OWNER,D.OBJECT_NAME,D.OPERATION,D.OPTIONS) V)
         SELECT A.CON_ID, A.TABLE_OWNER,
                A.TABLE_NAME,
                A.INDEX_OWNER,
                A.INDEX_NAME,
                A.CREATED,
                A.INDEX_TYPE,
                A.INDEX_MB,
                COUNT_INDEX_COLS,
                CASE
                  WHEN MIN_DATE IS NULL THEN
                   (SELECT MIN(TO_CHAR(NB.BEGIN_INTERVAL_TIME,'YYYY-MM-DD HH24:MI:SS')) FROM CDB_HIST_SNAPSHOT NB)
                  ELSE
                   MIN_DATE
                END AS MIN_DATE,
                CASE
                  WHEN MAX_DATE IS NULL THEN
                   (SELECT MAX(TO_CHAR(NB.BEGIN_INTERVAL_TIME, 'YYYY-MM-DD HH24:MI:SS')) FROM CDB_HIST_SNAPSHOT NB)
                  ELSE
                   MAX_DATE
                END AS MAX_DATE,
                PLAN_OPERATION,
                DENSE_RANK() OVER(ORDER BY INDEX_MB DESC) RANK_ORDER2
           FROM TMP1 A
           LEFT OUTER JOIN TMP2 B
             ON (A.INDEX_OWNER = B.INDEX_OWNER AND
                A.INDEX_NAME = B.INDEX_NAME AND A.CON_ID=B.CON_ID)
            AND RANK_ORDER <= 50)
          WHERE PLAN_OPERATION IS NULL
            AND RANK_ORDER2 <= 50
          ORDER BY  CON_ID,TABLE_OWNER, TABLE_NAME, INDEX_MB DESC;