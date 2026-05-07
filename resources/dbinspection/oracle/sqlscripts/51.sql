SELECT d.CON_ID,
       d.OWNER,
       d.TABLE_NAME,
       d.TABLESPACE_NAME,
       d.PARTITIONED,
       d.NUM_ROWS,
       d.LAST_ANALYZED,
       (SELECT sum(ds.BYTES) / 1024 / 1024
          FROM cdb_segments ds
         WHERE ds.segment_name = d.TABLE_NAME
				 and ds.CON_ID=d.CON_ID) tb_size_m,
       (SELECT sum(ds.BYTES) / 1024 / 1024
          FROM cdb_segments ds, cdb_indexes di
         WHERE ds.segment_name = di.index_name
           AND di.table_name = d.TABLE_NAME
					 and ds.CON_ID=di.CON_ID
					 and ds.CON_ID=d.CON_ID) index_size_m
  FROM cdb_tables d
 WHERE d.TABLE_NAME = 'AUD$'
 order by d.CON_ID;