select
    @@io_busy [I/O操作时钟周期数],
    @@timeticks [每个时钟周期对应的微秒数],
    CAST(@@io_busy AS bigint) * @@timeticks / 1000 [I/O操作毫秒数],
    getdate() [当前时间]