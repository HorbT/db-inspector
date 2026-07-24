-- 若报错“pg_stat_statements must be loaded via shared_preload_libraries”，请执行如下的SQL并重启DB
create extension if not exists pg_stat_statements;
