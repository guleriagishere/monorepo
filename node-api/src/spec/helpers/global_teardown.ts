import db from '../../models/db';

export default async () => {
    const dbName = (await db).name;

    // if(/(.+)_test/.test(dbName)){
    //     console.log(`dropping ${dbName} database in teardown phase`);
    // }

    await db.close();
}