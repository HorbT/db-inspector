SELECT A.INST_ID,
       sum(physical_reads) physical_reads,
       sum(db_block_gets) db_block_gets,
       TO_CHAR(sum(consistent_gets)) consistent_gets,
       round(DECODE(DECODE((sum(db_block_gets) + sum(consistent_gets)),
                           0,
                           0,
                           (sum(physical_reads) /
                           (sum(db_block_gets) + sum(consistent_gets)))),
                    0,
                    0,
                    1 -
                    DECODE((sum(db_block_gets) + sum(consistent_gets)),
                           0,
                           0,
                           (sum(physical_reads) /
                           (sum(db_block_gets) + sum(consistent_gets))))),
             4) * 100 || '%' "Hit Ratio"
  FROM Gv$buffer_pool_statistics A
	GROUP BY A.INST_ID;