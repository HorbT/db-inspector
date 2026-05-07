select  b.name as tablename ,
        a.rowcnt as datacount
from    sysindexes a ,
        sysobjects b
where   a.id = b.id
        and a.indid < 2
        and objectproperty(b.id, 'IsMSShipped') = 0
order by datacount desc;
