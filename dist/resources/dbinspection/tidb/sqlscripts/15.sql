SELECT USER AS login_user,
	LEFT ( HOST, POSITION( ':' IN HOST ) - 1 ) AS login_ip,
	count( 1 ) AS login_count
FROM `information_schema`.`PROCESSLIST` P
-- WHERE P.USER NOT IN ( 'root', 'repl', 'system user' )
GROUP BY USER,LEFT ( HOST, POSITION( ':' IN HOST ) - 1 )