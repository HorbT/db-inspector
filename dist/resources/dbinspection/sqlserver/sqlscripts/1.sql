select convert(varchar(30),login_time,120)
from master..sysprocesses where spid=1