-- 服务器级角色
SELECT
    member_principal_id = rm.member_principal_id,
    member_name = sp.name,
    role_principal_id = rm.role_principal_id,
    role_name = spr.name,
    role_scope = 'Server Level'
FROM sys.server_role_members AS rm
JOIN sys.server_principals AS sp
    ON rm.member_principal_id = sp.principal_id
JOIN sys.server_principals AS spr
    ON rm.role_principal_id = spr.principal_id

UNION ALL

-- 当前数据库级角色
SELECT
    member_principal_id = dm.member_principal_id,
    member_name = dp.name,
    role_principal_id = dm.role_principal_id,
    role_name = dpr.name,
    role_scope = 'Database Level'
FROM sys.database_role_members AS dm
JOIN sys.database_principals AS dp
    ON dm.member_principal_id = dp.principal_id
JOIN sys.database_principals AS dpr
    ON dm.role_principal_id = dpr.principal_id;