require('dotenv').config();
import db from '../models/db';

const state: string = process.argv[2];
const county: string = process.argv[3];
const city: string = process.argv[4];

console.log('selected state: ', state);
console.log('selected county: ', county);

( async () => {
    await db.models.PublicRecordProducer.updateMany(
        {
            source: 'code-violation2' 
        }, 
        {  
            $set: { processed: true }
        }
    );

    await db.models.PublicRecordProducer.updateOne(
        {
            source: 'code-violation2',
            state: state.toUpperCase(),
            county: county
        }, 
        {  
            $set: { processed: false }
        }
    );

    process.exit();
})();