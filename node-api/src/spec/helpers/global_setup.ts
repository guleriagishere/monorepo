import db from '../../models/db';

export default async () => {
    const dbName = (await db).name;

    // if(/(.+)_test/.test(dbName)){
    //     console.log(`dropping ${dbName} database in setup phase`);
    //     await db.dropDatabase();

    //     console.log('seed homesalesclub');
        
    // }

    await db.close();
}