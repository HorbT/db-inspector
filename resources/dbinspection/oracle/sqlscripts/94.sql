SELECT count(*), round(sum(sharable_mem) / 1024 / 1024, 2) sharable_mem_M
  FROM v$db_object_cache a;
