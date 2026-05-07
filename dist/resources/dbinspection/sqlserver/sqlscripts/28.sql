select
@@cpu_busy,
--@@timeticks [每个时钟周期对应的微秒数],
@@cpu_busy*cast(@@timeticks as float)/1000 [CPU工作时间(秒)],
@@idle*cast(@@timeticks as float)/1000 [CPU空闲时间(秒)],
getdate() [当前时间]