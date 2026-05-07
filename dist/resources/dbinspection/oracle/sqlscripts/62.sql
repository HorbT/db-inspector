SELECT d.CON_ID,
       '<div nowrap align="left"><font color="#336699"><b>' || owner ||
       '</b></font></div>' owner,
       object_name,
       object_type,
       DECODE(status,
              'VALID',
              '<div align="center"><font color="darkgreen"><b>' || status ||
              '</b></font></div>',
              '<div align="center"><font color="#990000"><b>' || status ||
              '</b></font></div>') status,
       'alter ' || DECODE(object_type,
                          'PACKAGE BODY',
                          'PACKAGE',
                          'TYPE BODY',
                          'TYPE',
                          object_type) || ' ' || owner || '.' ||
       object_name || ' ' ||
       DECODE(object_type, 'PACKAGE BODY', 'compile body', 'compile') || ';' hands_on
  FROM cdb_objects d
 WHERE owner not in ('PUBLIC')
   AND status <> 'VALID'
   AND rownum<=200
 ORDER BY con_id, owner, object_name;