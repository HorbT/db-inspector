exec sp_who3
/*
CREATE PROCEDURE sp_who3 ( @SessionID INT = NULL )
AS
    BEGIN


        SELECT  SPID = er.session_id ,
                Status = ses.status ,
                [Login] = ses.login_name ,
                Host = ses.host_name ,
                BlkBy = er.blocking_session_id ,
                DBName = DB_NAME(er.database_id) ,
                CommandType = er.command ,
                SQLStatement = st.text ,
                ObjectName = OBJECT_NAME(st.objectid) ,
                ElapsedMS = er.total_elapsed_time ,
                CPUTime = er.cpu_time ,
                IOReads = er.logical_reads + er.reads ,
                IOWrites = er.writes ,
                LastWaitType = er.last_wait_type ,
                StartTime = er.start_time ,
                Protocol = con.net_transport ,
                ConnectionWrites = con.num_writes ,
                ConnectionReads = con.num_reads ,
                ClientAddress = con.client_net_address ,
                Authentication = con.auth_scheme
        FROM    sys.dm_exec_requests er
                OUTER APPLY sys.dm_exec_sql_text(er.sql_handle) st
                LEFT JOIN sys.dm_exec_sessions ses ON ses.session_id = er.session_id
                LEFT JOIN sys.dm_exec_connections con ON con.session_id = ses.session_id
        WHERE   er.session_id > 50
                AND @SessionID IS NULL
                OR er.session_id = @SessionID
        ORDER BY er.blocking_session_id DESC ,
                er.session_id


    END
*/