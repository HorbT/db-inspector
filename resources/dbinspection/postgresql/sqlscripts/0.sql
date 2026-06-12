
-- 实例信息
select pg_postmaster_start_time() pg_start_time ,
extract(epoch from now() - pg_postmaster_start_time()) run_time,
pg_conf_load_time() config_file_load_time,
inet_server_addr() server_IP,
inet_server_port() server_port,
inet_client_addr() client_ip,
inet_client_port() client_port,
version() server_version,
(case when pg_is_in_recovery()='f' then 'primary' else 'standby' end ) as  primary_or_standby,
now() now_date,
(SELECT trunc(sum(blks_hit)/(sum(blks_read)+sum(blks_hit))*100,2)||'%' hit from pg_stat_database) all_db_hit 
;
