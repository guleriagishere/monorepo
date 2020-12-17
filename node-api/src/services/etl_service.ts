import { isDate, isDateTime, isInt, isFloat } from '../core/typeable';
import sqlPool from '../models/etl_db';
import EtlGenerator from '../scripts/db/etl_seed_generator';

// config
import { IConfigEnv } from '../iconfig';
import { config as CONFIG } from '../config';
const config: IConfigEnv = CONFIG[process.env.NODE_ENV || 'production'];

export default class EtlService {
    private tableId: string;
    private task: AbstractTask | null;

    constructor(tableId: string) {
        this.tableId = tableId;
        this.task = this.fetchTask(tableId);
    }

    fetchTask(tableId: string): AbstractTask | null {
        let task: AbstractTask | null = null;
        if(tableId === 'leads') {
            task = new LeadTask();
        } else if(tableId === 'deals') {
            task = new DealTask();
        } else if(tableId === 'master_queries') {
            task = new MasterQueryTask();
        }

        return task;
    }

    async exec(zohoData: any): Promise<boolean> {
        return await this.updateSchemaAndUpsert(zohoData);
    }

    async updateSchemaAndUpsert(zohoData: any): Promise<boolean> {
        let updateSchemaStatus: boolean = false;
        let tableExists = await this.tableExists();

        if(!tableExists) {
            await this.createTable();
        }

        let data = this.sanitizeData(zohoData);
        const columnNames: string[] = await this.columnNames();

        try {
            const columnsForCreate: { [key: string]: any }[] = this.buildColumns(columnNames, data);
            updateSchemaStatus = await this.updateSchema(columnsForCreate);
        } catch(e) {
            console.log('updateSchemaAndUpsert ERROR: ', e);
        }

        if(!updateSchemaStatus) {
            data = this.removeFailedSchemaColumns(columnNames, data);
        }

        return await this.upsert(data)
    }

    async tableExists(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            sqlPool.query(
                `SHOW TABLES LIKE '${this.tableId}'`
                ,  (e: any, res: string | any[]) => {
                    if(e) console.log('tableExists ERROR: ', e);
                    return e ? reject(false) : resolve(res.length > 0);
            });
        });
    }

    async createTable(): Promise<boolean | null> {
        if(this.task) {
            return await this.task.create(); 
        } else {
            return null;
        }
    }

    sanitizeData(data: { [key: string]: any }): { [key: string]: any }{
        return Object.keys(data).reduce((acc: { [key: string]: any }, key: string) => {
            if(data[key] !== null && data[key] !== undefined && key[0] !== '$' && (data[key] === 0 || data[key] ) && Object.prototype.toString.call(data[key]) !== '[object Object]'){
                acc[key] = data[key];
            }
            return acc;
        }, {});
    }

    async columnNames(): Promise<string[]>{
        const rows: {[key: string]: any}[] | null = await this.informationSchemaCol();
        if(rows?.length) {
            return rows.map( row => row['COLUMN_NAME'] );
        } else {
            return [];
        }
    }

    buildColumns(columnNames: string[], data: { [key: string]: any }): { [key: string]: any }[] {
        return Object.keys(data).reduce((acc: any[], key: string) => {
            if( !columnNames.includes(key) && this.buildDataType(data[key]) !== ''){
                acc.push({name: key, type: this.buildDataType(data[key])});
            } 

            return acc;
        }, []);
    }

    async updateSchema(columns: { [key: string]: any }[]): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const columnStr: string = columns.map( (col: { [key: string]: any }) => {
                return `ADD COLUMN ${col['name']} ${col['type']}`
            }).join(',');

            sqlPool.query(
                `ALTER TABLE ${this.tableId}
                ${columnStr};
                `,  (e: any, res: any) => {
                    if (e) console.log('updateSchema ERROR: ', e);
                    return e ? reject(false) : resolve(true);
            });
        })
    }

    removeFailedSchemaColumns(columnNames: any[], data: { [key: string]: any }): { [key: string]: any } {
        return columnNames.reduce( (acc: { [key: string]: any }, columnName: string) => {
            acc[columnName] = data[columnName];
            return acc;
        }, {});
    }

    buildDataType(type: any): string {
        let dataType = '';
        // ISO 8601 datetime
        if(isDateTime(type)){
            dataType = 'DATETIME';
        } else if (isDate(type)){
            dataType = 'DATE';
        } else if (typeof type === 'boolean') {
            dataType = 'BOOLEAN';
        } else if (typeof type === 'string' ) {
            if(type.length > 254) {
                dataType = 'TEXT';
            } else {
                // dataType = 'VARCHAR(255)';
                dataType = 'TEXT'; // handle InnoDB row size limit
            }
        } else if (typeof type === 'number' ) {
            if(isInt(type)) {
                dataType = 'BIGINT';
            } else if(isFloat(type)) {
                dataType = 'FLOAT';
            }
        } else if (Array.isArray(type)) {
            dataType = 'TEXT';
        }

        return dataType;
    }

    async upsert(data: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const records: {[key: string]: any} = this.sanitize(data);
            const columns = Object.keys(records);
            const values = Object.values(records);
            const onDuplicateKey = Object.keys(records).map( (key: string) => {
                const condition = ''
                const value = records[key];
                if(key != 'id') {
                    return `${key} = ${value}`;
                }

                return condition;
            }).filter( (condition: string) => { return condition !== ''}).join(', ');

            const query = `INSERT INTO ${this.tableId}(${columns.join(',')})
            VALUES(${values.join(',')})
            ON DUPLICATE KEY UPDATE
            ${onDuplicateKey}
           `;

            sqlPool.query(query, (e: any, res: any) => {
                    if(e) {
                        console.log('upsert ERROR: ', e);
                        console.log('FAULTY QUERY: ', query);
                    }
                    return e ? reject(false) : resolve(true);
            });
        });
    }

    async informationSchemaCol(): Promise<{[key: string]: any}[] | null>{
        return new Promise((resolve, reject) => {
            sqlPool.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA='${config.etl_db.database}' 
                AND TABLE_NAME='${this.tableId}';
            `, (e: any, res: { [key: string]: any; }[] | PromiseLike<{ [key: string]: any; }[] | null> | null | undefined) => {
                if(e) console.log('informationSchemaCol ERROR: ', e);
                return e ? reject(null) : resolve(res);
            });
        });
    }

    sanitize(data: {[key: string]: any}) {
        return Object.keys(data).reduce( (acc: {[key: string]: any}, key: string) => {
            if(data[key] !== null && data[key] !== undefined){
                if(Array.isArray(data[key])){
                    acc[key] = `'${JSON.stringify(data[key])}'`;
                } else if( isDate(data[key]) || isDateTime(data[key]) ) {
                    acc[key] = `'${new Date(data[key]).toISOString().replace(/T/, ' ').replace(/\..+/, '')}'`;
                } else if(typeof data[key] === 'string') {
                    acc[key] = sqlPool.escape(data[key]);
                } else {
                    acc[key] = data[key];
                }
            }

            return acc;
        }, {})
    }
}

abstract class AbstractTask {
    abstract async create(): Promise<boolean>;
}

class LeadTask extends AbstractTask {
    async create(): Promise<boolean> {
        let created: boolean = true;
        const generator = new EtlGenerator();

        try {
            await generator.createLead();
        } catch(e) {
            console.log('LEAD CREATE ERROR: ', e);
            created = false;
        }

        return created;
    }
}

class DealTask extends AbstractTask {
    async create(): Promise<boolean> {
        let created: boolean = true;
        const generator = new EtlGenerator();

        try {
            await generator.createDeal();
        } catch(e) {
            console.log('DEAL CREATE ERROR: ', e);
            created = false;
        }

        return created;
    }
}

class MasterQueryTask extends AbstractTask {
    async create(): Promise<boolean> {
        let created: boolean = true;
        const generator = new EtlGenerator();

        try {
            await generator.createMasterQueries();
            await generator.truncateMasterQueries();
            await generator.bulkInsertMasterQueries();
        } catch(e) {
            console.log('MASTER_QUERY CREATE ERROR: ', e);
            created = false;
        }

        return created;
    }
}