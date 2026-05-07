select
    df.[name],df.physical_name,df.[size],df.growth,
    f.[name][filegroup],f.is_default
from sys.database_files df join sys.filegroups f
on df.data_space_id = f.data_space_id