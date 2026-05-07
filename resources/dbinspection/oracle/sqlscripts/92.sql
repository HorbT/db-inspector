SELECT /*+ RULE */
 o.con_id,
 INST_ID,
 LS.OSUSER OS_USER_NAME,
 LS.USERNAME USER_NAME,
 DECODE(LS.TYPE,
        'RW',
        'Row wait enqueue lock',
        'TM',
        'DML enqueue lock',
        'TX',
        'Transaction enqueue lock',
        'UL',
        'User supplied lock') LOCK_TYPE,
 O.OBJECT_NAME OBJECT,
 DECODE(LS.LMODE,
        1,
        NULL,
        2,
        'Row Share',
        3,
        'Row Exclusive',
        4,
        'Share',
        5,
        'Share Row Exclusive',
        6,
        'Exclusive',
        NULL) LOCK_MODE,
 O.OWNER,
 LS.SID,
 LS.SERIAL# SERIAL_NUM,
 LS.ID1,
 LS.ID2
FROM   cdb_OBJECTS O,
       (SELECT s.con_id, s.INST_ID,
               S.OSUSER,
               S.USERNAME,
               L.TYPE,
               L.LMODE,
               S.SID,
               S.SERIAL#,
               L.ID1,
               L.ID2
        FROM   gV$SESSION S,
               gV$LOCK     L
        WHERE  S.SID = L.SID
   AND  s.INST_ID=l.INST_ID
	 and s.con_id=l.con_id) LS
WHERE  O.OBJECT_ID = LS.ID1
and o.con_id=ls.con_id
AND    O.OWNER <> 'SYS'
ORDER  BY o.con_id, INST_ID,
          O.OWNER,
          O.OBJECT_NAME;