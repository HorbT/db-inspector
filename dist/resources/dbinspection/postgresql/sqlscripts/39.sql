SELECT * from (SELECT
datname,
blks_read::text blks_read,
blks_hit::text blks_hit,
xact_commit::text,
xact_rollback::text,
 trunc((blks_hit::numeric/(blks_read + blks_hit)) * 100,2)||'%'  cache_hit, 
 trunc((xact_commit::numeric/(xact_commit + xact_rollback)) * 100,2)||'%'  commit_hit,
 stats_reset::VARCHAR stats_reset
FROM pg_stat_database 
where datname not in ('template0','template1') 
and blks_read + blks_hit > 0 
ORDER BY cache_hit) aa
union all
select '------','','','','',
trunc(sum(blks_hit)/(sum(blks_read)+sum(blks_hit))*100,2)||'%' cache_hit,
trunc(sum(xact_commit)/(sum(xact_commit)+sum(xact_rollback))*100,2)||'%'  commit_hit,
''
 from pg_stat_database d 
where d.datname not in ('template0','template1');
