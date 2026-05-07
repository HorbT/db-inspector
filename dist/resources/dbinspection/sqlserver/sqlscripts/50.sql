CREATE TABLE #VLFInfo (
    RecoveryUnitID INT
    ,FileID INT
    ,FileSize BIGINT
    ,StartOffset BIGINT
    ,FSeqNo BIGINT
    ,[Status] BIGINT
    ,Parity BIGINT
    ,CreateLSN NUMERIC(38)
    );
CREATE TABLE #VLFCountResults (
    DatabaseName SYSNAME
    ,VLFCount INT
    );
EXEC sp_MSforeachdb N'Use [?];
                INSERT INTO #VLFInfo
                EXEC sp_executesql N''DBCC LOGINFO([?])'';
                INSERT INTO #VLFCountResults
                SELECT DB_NAME(), COUNT(*)
                FROM #VLFInfo;
                TRUNCATE TABLE #VLFInfo;'
SELECT DatabaseName
    ,VLFCount
FROM #VLFCountResults
ORDER BY VLFCount DESC;
DROP TABLE #VLFInfo;
DROP TABLE #VLFCountResults;