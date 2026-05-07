SELECT D.CON_ID, d.tablespace_name "Name",
       TO_CHAR(NVL(a.bytes / 1024 / 1024, 0), '99,999,990.900') "Size (M)",
       TO_CHAR(NVL(t.hwm, 0) / 1024 / 1024, '99999999.999') "HWM (M)",
       TO_CHAR(NVL(t.hwm / a.bytes * 100, 0), '990.00') "HWM % ",
       TO_CHAR(NVL(t.bytes / 1024 / 1024, 0), '99999999.999') "Using (M)",
       TO_CHAR(NVL(t.bytes / a.bytes * 100, 0), '990.00') "Using %"
  FROM CDB_tablespaces d,
       (SELECT A.CON_ID, tablespace_name, sum(bytes) bytes
          FROM CDB_temp_files A
         GROUP BY A.CON_ID, tablespace_name) a,
       (SELECT A.CON_ID, tablespace_name,
               sum(bytes_cached) hwm,
               sum(bytes_used) bytes
          FROM v$temp_extent_pool A
         GROUP BY A.CON_ID,  tablespace_name) t
 WHERE d.tablespace_name = a.tablespace_name(+)
   AND  d.tablespace_name = t.tablespace_name(+)  
	 AND D.CON_ID=A.CON_ID(+)  AND D.CON_ID=T.CON_ID(+)
   AND  d.extent_management = 'LOCAL'
   AND  d.contents = 'TEMPORARY';  