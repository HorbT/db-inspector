SELECT
    a.INSTANCE_NUMBER,
    a.os_username,
    a.username,
    a.terminal,
    a.userhost,
    a.returncode,
    a.TERMINAL
  FROM DBA_AUDIT_SESSION a
  WHERE
    a.returncode = 1017      -- 筛选登录失败（密码错误等）
    AND a.timestamp >= SYSDATE - 7
    and ROWNUM <= 100
  ORDER BY a.timestamp DESC
