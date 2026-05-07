with force_mathces as
 (select l.force_matching_signature,
         max(l.sql_id) sql_id,
         dense_rank() over(order by count(*) desc) ranking,
		 sum(l.EXECUTIONS)  EXECUTIONS,
         count(*) counts
    from v$sqlarea l
   where l.force_matching_signature <> 0
   and l.sql_text not like '%:%'
   and l.parsing_schema_name  NOT IN ('SYS','SYSTEM','PUBLIC','MDSYS','TSMSYS','DMSYS','DBSNMP','SCOTT','LHR','LHR2','DB_MONITOR','OUTLN','MGMT_VIEW','FLOWS_FILES','ORDSYS','EXFSYS','WMSYS','APPQOSSYS','APEX_030200','APEX_050000','OWBSYS_AUDIT','ORDDATA','CTXSYS','ANONYMOUS','SYSMAN','XDB','ORDPLUGINS','OWBSYS','SI_INFORMTN_SCHEMA','OLAPSYS','ORACLE_OCM','XS$NULL','BI','PM','MDDATA','IX','SH','DIP','OE','APEX_PUBLIC_USER','HR','SPATIAL_CSW_ADMIN_USR','SPATIAL_WFS_ADMIN_USR','APEX_040200','DVSYS','LBACSYS','GSMADMIN_INTERNAL','AUDSYS','OJVMSYS','SYS$UMF','GGSYS','DBSFWUSER','DVF','GSMCATUSER','SYSBACKUP','REMOTE_SCHEDULER_AGENT','GSMUSER','SYSRAC','SYSKM','SYSDG','PDBADMIN','WKSYS','GSMROOTUSER','CSMIG','WKPROXY','WK_TEST','SI_INFORMATN_SCHEMA')
   group by l.force_matching_signature
  having count(*) > 10)
select v.sql_id,
       v.sql_text,
       v.parsing_schema_name,
       fm.force_matching_signature,
       fm.ranking,
       fm.counts,
	   fm.EXECUTIONS
  from force_mathces fm, v$sqlarea v
 where fm.sql_id = v.sql_id
   and fm.ranking <= 50
 order by fm.ranking;