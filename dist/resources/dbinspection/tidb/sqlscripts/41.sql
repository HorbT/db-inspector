select * from INFORMATION_SCHEMA.CLUSTER_LOG d
         where d.TIME > date_format(date_sub(now(),interval 1 day),'%Y-%m-%d %H:%i:%s')
           and d.TIME < date_format(now(),'%Y-%m-%d %H:%i:%s')
           AND LEVEL = 'ERROR' ORDER BY time desc limit 1000;