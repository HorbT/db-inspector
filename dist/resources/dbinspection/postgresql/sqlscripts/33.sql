SELECT *
FROM   pg_settings a
WHERE  a.name IN ('data_directory',
                  'port',
                  'client_encoding',
                  'config_file',
                  'hba_file',
                  'ident_file',
                  'archive_mode','wal_level','archive_command','restore_command','synchronous_commit','synchronous_standby_names',
                  'max_wal_senders','wal_sender_timeout','wal_keep_size','hot_standby','max_replication_slots','wal_log_hints',
                  'wal_keep_segments',
                  'logging_collector',
                  'log_directory',
                  'log_filename',
                  'log_truncate_on_rotation',
                  'log_statement',
                  'log_min_duration_statement',
                  'max_connections',
                  'listen_addresses',
                  'shared_buffers',
                  'shared_preload_libraries',
                 'recovery_target_timeline')
ORDER  BY NAME;
