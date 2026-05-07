SELECT di.owner index_owner,
       di.table_owner,
       di.table_name,
       di.index_name,
       di.index_type,
       di.uniqueness,
       (SELECT DECODE(nb.constraint_type, 'P', 'YES')
          FROM cdb_constraints nb
         WHERE nb.constraint_name = di.index_name
           AND nb.owner = di.owner
           and nb.CON_ID=di.CON_ID
           AND nb.constraint_type = 'P'
           and rownum<=1) is_primary_key,
       di.partitioned,
       (SELECT COUNT(1)
          FROM cdb_ind_columns dic
         WHERE dic.index_name = di.index_name
           AND dic.table_name = di.table_name
           AND dic.INDEX_OWNER = di.owner
           and dic.CON_ID=di.CON_ID) IND_COLS_COUNT,
       di.tablespace_name,
       di.status,
       --di.visibility,
       di.last_analyzed,
       di.degree,
       di.num_rows,
       DECODE(di.num_rows, 0, '', round(di.distinct_keys / di.num_rows, 2)) selectivity,
       di.BLEVEL 索引的分支层数,
       di.blevel + 1 索引的高度,
       di.LEAF_BLOCKS 叶子结点的个数,
       di.DISTINCT_KEYS 唯一值的个数,
       di.AVG_LEAF_BLOCKS_PER_KEY 每个KEY的平均叶块个数,
       di.AVG_DATA_BLOCKS_PER_KEY 每个KEY的平均数据块数,
       di.clustering_factor 集群因子,
       di.compression,
       di.logging,
       (SELECT d.CREATED
          FROM cdb_OBJECTS d
         WHERE d.OBJECT_NAME = di.INDEX_NAME
           AND d.OBJECT_TYPE = 'INDEX'
           AND d.OWNER = DI.OWNER
           and d.CON_ID=di.CON_ID
					 AND ROWNUM<=1) INDEX_CREATE
  FROM cdb_indexes di
  join (select DIS.CON_ID, DIS.STALE_STATS,dis.OWNER,dis.INDEX_NAME,DIS.TABLE_OWNER,DIS.TABLE_NAME from  cdb_ind_statistics dis
    where dis.OBJECT_TYPE = 'INDEX' and dis.STALE_STATS='YES'
		AND DIS.OWNER  not in ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA') ) dict
    on (dict.index_name = di.index_name and dict.table_name = di.table_name and  dict.OWNER = di.owner AND DICT.TABLE_OWNER=DI.TABLE_OWNER and dict.con_id=di.CON_ID)
 WHERE di.index_type != 'LOB'
   AND DI.owner not in ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
   AND exists (SELECT 1 FROM cdb_segments nd　where segment_name = di.index_name AND nd.owner = owner and nd.con_id=di.CON_ID) and ROWNUM<=100 ;
