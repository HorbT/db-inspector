SELECT a.CON_ID,
       a.name,
       a.OPEN_MODE,
       a.RESTRICTED,
       a.DBID,
       a.GUID,
       a.CREATE_SCN,
       to_char(a.OPEN_TIME, 'YYYY-MM-DD HH24:MI:SS') OPEN_TIME,
       round(a.TOTAL_SIZE/1024/1024) TOTAL_SIZE_M
  FROM v$containers a;