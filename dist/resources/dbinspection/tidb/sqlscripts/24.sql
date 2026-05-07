select count(distinct plan_digest) as count,
       digest,
      min(query)  query
from INFORMATION_SCHEMA.cluster_slow_query
group by digest
having count > 1
limit 3