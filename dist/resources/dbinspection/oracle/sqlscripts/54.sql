SELECT *
  FROM (SELECT l.CON_ID, '<div nowrap align="left"><font color="#336699"><b>' ||
               l.owner || '</b></font></div>' owner,
               '<div nowrap>' || l.table_name || '</div>' table_name,
               '<div nowrap>' || l.column_name || '</div>' column_name,
               '<div nowrap>' || l.segment_name || '</div>' segment_name,
               '<div nowrap>' || s.tablespace_name || '</div>' tablespace_name,
               '<div nowrap align="right">' ||
               TO_CHAR(s.bytes, '999,999,999,999,999') || '</div>' lob_segment_bytes,
               '<div nowrap>' || l.index_name || '</div>' index_name,
               DECODE(l.in_row,
                      'YES',
                      '<div align="center"><font color="darkgreen"><b>' ||
                      l.in_row || '</b></font></div>',
                      'NO',
                      '<div align="center"><font color="#990000"><b>' ||
                      l.in_row || '</b></font></div>',
                      '<div align="center"><font color="#663300"><b>' ||
                      l.in_row || '</b></font></div>') in_row
          FROM cdb_lobs l, cdb_segments s
         WHERE l.owner = s.owner
           AND l.segment_name = s.segment_name
					 and l.CON_ID=s.CON_ID
           and  l.owner   NOT IN ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
         ORDER BY s.bytes desc) t
 WHERE ROWNUM <= 30
 ORDER BY con_id, t.owner, t.table_name, t.column_name;