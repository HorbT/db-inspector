SELECT * FROM pg_stat_io WHERE reads <> 0 OR writes <> 0 OR extends <> 0;
