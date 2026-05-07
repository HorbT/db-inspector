SELECT di.CON_ID,
       di.inst_id,
       di.GROUP_NUMBER,
       di.NAME,
       di.BLOCK_SIZE,
       di.STATE,
       di.TYPE,
       di.TOTAL_MB,
       di.FREE_MB,
       di.COMPATIBILITY,
       --di.VOTING_FILES,
       di.OFFLINE_DISKS
  FROM gv$asm_diskgroup di
 ORDER BY di.con_id, di.inst_id, di.GROUP_NUMBER;