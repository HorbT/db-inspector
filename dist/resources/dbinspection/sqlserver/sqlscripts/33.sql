select a.text seesion_text,a.wait_type,a.wait_time,a.session_id,a.blocking_session_id,b.text blocking_session_text from
 (select text,wait_resource,wait_type,wait_time,session_id,blocking_session_id from sys.dm_exec_requests  
 cross apply sys.dm_exec_sql_text(sql_handle) where wait_time>1000) a left join 
 (select c.session_id,t.text from sys.dm_exec_connections as c cross apply sys.dm_exec_sql_text(most_recent_sql_handle) as t) b  
 on b.session_id=a.blocking_session_id;