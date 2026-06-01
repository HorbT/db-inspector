SELECT a.`ENGINE`,count( * ) counts 
FROM    information_schema.`TABLES` a 
GROUP BY a.`ENGINE`