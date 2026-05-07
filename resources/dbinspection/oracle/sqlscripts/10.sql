select tablespace_name,total_mb,total_act_mb,used_mb,free_mb,used_pct from 
(
select p.*,
case p.tablespace_name
when 'SYSTEM' then 1
when 'SYSAUX' then 2
when 'USERS' then 3
when 'UNDOTBS1' then 4
when 'UNDOTBS2' then 5
when 'UNDOTBS3' then 6
when 'UNDOTBS4' then 7
 else 9 end od
 from (
 select t.tablespace_name,t.total_mb,t.total_act_mb,t.total_act_mb-f.total_free_mb used_mb,total_free_mb free_mb,
 to_char((t.total_act_mb - f.total_free_mb)/t.total_mb * 100,'990.99')||'%' as used_pct
 from
 (select tablespace_name,round(sum(maxbytes)/(1024*1024)) total_mb,round(sum(bytes)/(1024*1024)) total_act_mb
 from dba_data_files group by tablespace_name) t,  
 (select tablespace_name,round(sum(bytes)/(1024*1024)) total_free_mb  
 from dba_free_space group by tablespace_name) f  
 where t.tablespace_name = f.tablespace_name  
 ) p
union all
select d.tablespace_name,total_mb,space total_act_mb,used_space used_mb,space-used_space free_mb,
to_char((nvl(used_space,0)/space*100),990.99)||'%' used_pct, 8 od
from (select tablespace_name,round(sum(maxbytes) / (1024 * 1024)) total_mb,round(sum(bytes)/(1024*1024)) space from dba_temp_files group by tablespace_name) d,
(select tablespace_name,round(sum(bytes_used)/(1024*1024)) used_space from v$temp_space_header group by tablespace_name) f
where d.tablespace_name = f.tablespace_name(+))  
order by od,used_pct desc;