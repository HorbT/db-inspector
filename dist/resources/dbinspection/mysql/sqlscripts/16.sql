select r.trx_isolation_level,
       r.trx_id              waiting_trx_id,
       r.trx_mysql_thread_id waiting_trx_thread,
       r.trx_state           waiting_trx_state,
       lr.lock_mode          waiting_trx_lock_mode,
       lr.lock_type          waiting_trx_lock_type,
       lr.lock_data         waiting_trx_lock_table,
       r.trx_query           waiting_trx_query,
       b.trx_id              blocking_trx_id,
       b.trx_mysql_thread_id blocking_trx_thread,
       b.trx_state           blocking_trx_state,
       lb.lock_mode          blocking_trx_lock_mode,
       lb.lock_type          blocking_trx_lock_type,
       lb.lock_data         blocking_trx_lock_table,
       b.trx_query           blocking_query
  from performance_schema.data_lock_waits w
 inner join information_schema.innodb_trx b
    on b.trx_id = w.blocking_thread_id
 inner join information_schema.innodb_trx r
    on r.trx_id = w.requesting_thread_id
 inner join performance_schema.data_locks lb
    on lb.thread_id = w.blocking_thread_id
 inner join performance_schema.data_locks lr
    on lr.thread_id = w.requesting_thread_id;