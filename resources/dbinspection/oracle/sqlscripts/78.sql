SELECT a.CON_ID,
       a.OWNER,
       a.TABLE_NAME,
       a.TYPE_OWNER,
       a.TYPE_NAME,
       a.DEFAULT_DIRECTORY_OWNER,
       a.DEFAULT_DIRECTORY_NAME,
       a.REJECT_LIMIT,
       a.ACCESS_TYPE,
       -- a.ACCESS_PARAMETERS,
       a.PROPERTY
  FROM cdb_external_tables a
 order by con_id, owner;