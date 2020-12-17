import mysql from 'mysql';

// config
import { IConfigEnv } from '../iconfig';
import { config as CONFIG } from '../config';
const config: IConfigEnv = CONFIG[process.env.NODE_ENV || 'dev'];

const sqlPool  = mysql.createPool({
  connectionLimit : 20, // each task handles at most 20 concurrent connections prior to auto scaling
  host            : config.etl_db.host,
  user            : config.etl_db.user,
  password        : config.etl_db.password,
  database        : config.etl_db.database
});

export default sqlPool;