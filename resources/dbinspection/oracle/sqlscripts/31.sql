SELECT df.con_id,
       '<font color="#336699"><b>' || df.tablespace_name || '</b></font>' Tablespace,
       df.file_name ,
       fs.phyrds Physical_Reads,
       '<div align="right">' ||
       ROUND((fs.phyrds * 100) / (fst.pr + tst.pr), 2) || '%</div>' read_pct,
       fs.phywrts Physical_Writes,
       '<div align="right">' ||
       ROUND((fs.phywrts * 100) / (fst.pw + tst.pw), 2) || '%</div>' write_pct,
       (fs.phyrds + fs.phywrts) total_io
  FROM cdb_data_files df,
       v$filestat fs,
       (SELECT f.CON_ID,sum(f.phyrds) pr, sum(f.phywrts) pw FROM v$filestat f group by f.CON_ID) fst,
       (SELECT t.CON_ID,sum(t.phyrds) pr, sum(t.phywrts) pw FROM v$tempstat t group by t.CON_ID) tst
 WHERE df.file_id = fs.file#
   and Df.con_id = fs.CON_ID
	 and Df.con_id=fst.con_id
	 and Df.con_id=tst.con_id
UNION all
SELECT tf.con_id,
       '<font color="#336699"><b>' || tf.tablespace_name || '</b></font>' tablespace_name,
       tf.file_name fname,
       ts.phyrds phyrds,
       '<div align="right">' ||
       ROUND((ts.phyrds * 100) / (fst.pr + tst.pr), 2) || '%</div>' read_pct,
       ts.phywrts phywrts,
       '<div align="right">' ||
       ROUND((ts.phywrts * 100) / (fst.pw + tst.pw), 2) || '%</div>' write_pct,
       (ts.phyrds + ts.phywrts) total_io
  FROM cdb_temp_files tf,
       v$tempstat ts,
       (SELECT  f.CON_ID,sum(f.phyrds) pr, sum(f.phywrts) pw FROM v$filestat f group by f.CON_ID) fst,
       (SELECT t.con_id,sum(t.phyrds) pr, sum(t.phywrts) pw FROM v$tempstat t group by t.CON_ID) tst
 WHERE tf.file_id = ts.file#
   and tf.con_id = ts.con_id
	 and tf.con_id=fst.con_id
	 and tf.CON_ID=tst.con_id
 ORDER BY con_id, Physical_Reads DESC;