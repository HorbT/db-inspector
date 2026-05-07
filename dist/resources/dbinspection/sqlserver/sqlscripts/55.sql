CREATE TABLE #ErrorLog (
    LogDate DATETIME,
    ProcessInfo NVARCHAR(100),
    [Text] NVARCHAR(MAX)
);
INSERT INTO #ErrorLog
EXEC master.dbo.xp_readerrorlog
    0,          -- 日志文件编号
    1,          -- 日志类型
    NULL,       -- 搜索关键词1
    NULL,       -- 搜索关键词2
    NULL,       -- 开始时间
    NULL,       -- 结束时间
    N'desc';    -- 倒序（最新在前）
SELECT TOP 50 *
FROM #ErrorLog
ORDER BY LogDate DESC;  -- 确保按日期倒序（与原逻辑一致）
DROP TABLE #ErrorLog;