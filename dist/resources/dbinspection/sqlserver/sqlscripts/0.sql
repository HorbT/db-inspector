select name,
	user_access_desc,--用户访问模式
	state_desc,--数据库状态
	recovery_model_desc,--恢复模式
	page_verify_option_desc,--页检测选项
	log_reuse_wait_desc--日志重用等待
from sys.databases;
