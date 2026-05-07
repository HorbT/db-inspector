SELECT a.con_id,
       a.inst_id ,
       a.GROUP_NUMBER,
       a.DISK_NUMBER,
       a.NAME,
       a.path,
       a.STATE,
       a.MOUNT_STATUS,
       a.TOTAL_MB,
       a.FREE_MB,
       a.CREATE_DATE,
       a.MOUNT_DATE,
       a.LIBRARY --,
--a.OS_MB
  FROM gV$ASM_DISK a
 ORDER BY a.con_id,a.inst_id, a.GROUP_NUMBER, a.DISK_NUMBER;