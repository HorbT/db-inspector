select db_name(database_id) dbname,
	type_desc,--文件类型
	name,
	physical_name,--文件位置
	state_desc,--文件状态
	size * 8.0/1024 as '文件大小（MB）'
from sys.master_files
where type_desc = 'LOG';