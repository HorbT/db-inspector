select db_name(database_id) dbname,
	type_desc,
	name,
	physical_name,
	state_desc,
	size * 8.0/1024 as '文件大小（MB）'
from sys.master_files;