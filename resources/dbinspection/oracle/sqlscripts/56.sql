SELECT con_id,
       owner owner,
       table_name table_name,
       '' partition_name,
       num_rows num_rows,
       '<div align="right">' || ROUND((chain_cnt / num_rows) * 100, 2) ||
       '%</div>' pct_chained_rows,
       avg_row_len avg_row_length
  FROM (select d.con_id, owner, table_name, chain_cnt, num_rows, avg_row_len
          from cdb_tables d
         where chain_cnt IS NOT NULL
           AND num_rows IS NOT NULL
           AND chain_cnt > 0
           AND num_rows > 0
           AND owner != 'SYS')
UNION ALL
SELECT con_id,
       table_owner owner,
       table_name table_name,
       partition_name partition_name,
       num_rows num_rows,
       '<div align="right">' || ROUND((chain_cnt / num_rows) * 100, 2) ||
       '%</div>' pct_chained_rows,
       avg_row_len avg_row_length
  FROM (select con_id,
               table_owner,
               table_name,
               partition_name,
               chain_cnt,
               num_rows,
               avg_row_len
          from cdb_tab_partitions
         where chain_cnt IS NOT NULL
           AND num_rows IS NOT NULL
           AND chain_cnt > 0
           AND num_rows > 0
           AND table_owner != 'SYS') b
 WHERE (chain_cnt / num_rows) * 100 > 10;