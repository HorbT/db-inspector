SELECT a.INST_ID,
       a.WAIT_CLASS#,
       a.WAIT_CLASS,
       a.EVENT,
       COUNT(1) counts
FROM   gv$session a
WHERE  a.WAIT_CLASS <> 'Idle'
GROUP  BY a.INST_ID,
          a.WAIT_CLASS#,
          a.WAIT_CLASS,
          a.EVENT
ORDER  BY a.INST_ID,
          counts DESC;