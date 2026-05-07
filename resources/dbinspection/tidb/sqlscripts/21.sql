select count(*) counts,
       min(time) min_time,
       max(time) max_time
from INFORMATION_SCHEMA.slow_query