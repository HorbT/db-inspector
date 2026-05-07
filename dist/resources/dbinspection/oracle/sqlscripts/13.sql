SELECT C.NAME NAME,
       DECODE(C.STATUS,
              NULL,
              '<div align="center"><b><font color="darkgreen">VALID</font></b></div>',
              '<div align="center"><b><font color="#663300">' || C.STATUS ||
              '</font></b></div>') STATUS,
       '<div align="right">' ||
       TO_CHAR(BLOCK_SIZE * FILE_SIZE_BLKS, '999,999,999,999') || '</div>' FILE_SIZE
  FROM V$CONTROLFILE C
 ORDER BY C.NAME;