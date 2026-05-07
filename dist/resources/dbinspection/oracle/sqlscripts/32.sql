SELECT s.CON_ID, d.name file_name,
       s.phyrds Physical_Reads,
       ROUND((s.readtim / GREATEST(s.phyrds, 1)), 2) read_rate,
       s.phywrts Physical_Writes,
       ROUND((s.writetim / GREATEST(s.phywrts, 1)), 2) write_rate
  FROM v$filestat s, v$datafile d
 WHERE s.file# = d.file#
 and s.CON_ID=d.CON_ID
UNION
SELECT s.CON_ID, t.name file_name,
       s.phyrds Physical_Reads,
       ROUND((s.readtim / GREATEST(s.phyrds, 1)), 2) read_rate,
       s.phywrts Physical_Writes,
       ROUND((s.writetim / GREATEST(s.phywrts, 1)), 2) write_rate
  FROM v$tempstat s, v$tempfile t
 WHERE s.file# = t.file#
 and s.CON_ID=t.CON_ID
 ORDER BY 1,3 DESC;