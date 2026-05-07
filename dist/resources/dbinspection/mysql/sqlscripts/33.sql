SELECT
i.database_name ASdb,
i.table_name AStable,
i.index_name ASindex_name,
i.stat_description AScols,
i.stat_value ASdefferRows,
t.n_rows ASROWS,
ROUND(((i.stat_value / IFNULL(IF(t.n_rows < i.stat_value,i.stat_value,t.n_rows),0.01))),2) AS sel_persent
FROM mysql.innodb_index_stats i
INNER JOIN mysql.innodb_table_stats t
ON i.database_name = t.database_name AND i.table_name= t.table_name
WHERE i.index_name != 'PRIMARY' AND i.stat_name LIKE '%n_diff_pfx%'
and ROUND(((i.stat_value / IFNULL(IF(t.n_rows < i.stat_value,i.stat_value,t.n_rows),0.01))),2)<0.1
and t.n_rows !=0
and i.stat_value !=0
and i.database_name not in ('mysql', 'information_schema', 'sys', 'performance_schema')
limit 100;