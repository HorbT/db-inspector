select
	table_schema as 数据库名,
	table_name as 物化视图名,
	is_active as 是否激活,
	LAST_REFRESH_START_TIME AS 上次刷新开始,
	LAST_REFRESH_FINISHED_TIME AS 上次刷新结束,
	QUERY_REWRITE_STATUS as 重写状态
FROM
	information_schema.materialized_views;