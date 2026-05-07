SELECT d.CON_ID,
       '<b><font color="#336699">' || grantee || '</font></b>' grantee,
       '<div align="center">' || granted_role || '</div>' granted_role,
       DECODE(admin_option,
              'YES',
              '<div align="center"><font color="darkgreen"><b>' ||
              admin_option || '</b></font></div>',
              'NO',
              '<div align="center"><font color="#990000"><b>' ||
              admin_option || '</b></font></div>',
              '<div align="center"><font color="#663300"><b>' ||
              admin_option || '</b></font></div>') admin_option,
       DECODE(default_role,
              'YES',
              '<div align="center"><font color="darkgreen"><b>' ||
              default_role || '</b></font></div>',
              'NO',
              '<div align="center"><font color="#990000"><b>' ||
              default_role || '</b></font></div>',
              '<div align="center"><font color="#663300"><b>' ||
              default_role || '</b></font></div>') default_role
  FROM cdb_role_privs d
 WHERE granted_role = 'DBA'
 ORDER BY d.CON_ID, grantee, granted_role;