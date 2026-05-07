select *
  from (select owner, ceil(sum(bytes) / 1024 / 1024 / 1024) seg_size
          from dba_segments
         group by owner) a
 where a.seg_size > 1 and rownum<11
 order by a.seg_size desc;
