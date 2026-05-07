SELECT '<div nowrap><b><font color="#336699">' || r.command_id ||
       '</font></b></div>' 备份名称,
       '<div nowrap align="right">' ||
       TO_CHAR(r.START_TIME, 'yyyy-mm-dd HH24:MI:SS') || '</div>' 开始时间,
       '<div nowrap align="right">' || r.time_taken_display || '</div>' 花费时间,
       ELAPSED_SECONDS,
       DECODE(r.status,
              'COMPLETED',
              '<div align="center"><b><font color="darkgreen">' || r.status ||
              '</font></b></div>',
              'RUNNING',
              '<div align="center"><b><font color="#000099">' || r.status ||
              '</font></b></div>',
              'FAILED',
              '<div align="center"><b><font color="#990000">' || r.status ||
              '</font></b></div>',
              '<div align="center"><b><font color="#663300">' || r.status ||
              '</font></b></div>') 状态,
       r.input_type 输入类型,
       r.output_device_type 输出设备,
       '<div nowrap align="right">' || r.input_bytes_display || '</div>' 输入大小,
       '<div nowrap align="right">' || r.output_bytes_display || '</div>' 输出大小,
       '<div nowrap align="right">' || r.INPUT_BYTES_PER_SEC_DISPLAY ||
       '</div>' 每秒钟写入IO,
       '<div nowrap align="right">' || r.output_bytes_per_sec_display ||
       '</div>' 每秒钟读取IO
  FROM (SELECT command_id,
               START_TIME,
               time_taken_display,
               ELAPSED_SECONDS,
               status,
               input_type,
               output_device_type,
               input_bytes_display,
               INPUT_BYTES_PER_SEC_DISPLAY,
               output_bytes_display,
               output_bytes_per_sec_display
          FROM v$rman_backup_job_details a
         ORDER BY START_TIME DESC) r
 WHERE ROWNUM <= 20;