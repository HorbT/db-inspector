----------------------------------------
------- 锁情况
----------------------------------------
SELECT
	max_conn 最大连接数,
	now_conn 当前连接数,
	max_conn - now_conn 剩余连接数 
FROM
	( SELECT setting::int8  AS max_conn, ( SELECT COUNT ( * ) FROM pg_stat_activity ) AS now_conn FROM pg_settings WHERE NAME = 'max_connections' ) T;
