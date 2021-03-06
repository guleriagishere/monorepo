require('dotenv').config();
import db from '../models/db';
import { IPublicRecordProducer } from '../models/public_record_producer';
import AbstractProducer from '../categories/public_records/producers/abstract_producer';

async function fetchProduct(productName: string): Promise<any> {
    const {default: Product} = await import(productName);
    return Product;
}

( async () => {
    // use findOneAndUpdate for atomic operation since multiple tasks run in parallel and we don't want to tasks pulling the same public record producer
    const publicRecordProducer: IPublicRecordProducer = await db.models.PublicRecordProducer.findOneAndUpdate({ source: 'code-violation1', processed: 'false' }, { processed: true });
    
    if (publicRecordProducer) {
        const state = publicRecordProducer.state.toLowerCase();
        const county = publicRecordProducer.county;
        const city = publicRecordProducer.city;
        let civilProducer: any;
        try {
            civilProducer = await fetchProduct(`../categories/public_records/producers/code_violation1/${state}/${county}/${city?city+'/':''}civil_producer`);
        } catch(e) {
            console.log(`cannot find code-violation1 covil producer state: ${state} county: ${county} ${city ? 'city: '+city : ''}`);
        }

        if(civilProducer) {
            console.log(`now processing 'county: ' ${county} ${city ? 'city: '+city : ''} in state: ${state} at ${new Date()}`);
            console.log(publicRecordProducer);
            await new civilProducer(publicRecordProducer).startParsing();
        } else {
            await AbstractProducer.sendMessage(publicRecordProducer.county, publicRecordProducer.state, 0, 'Code Violation1', '', true);
        }
    } else {
        console.log('==============================');
        console.log('no remaining code-violation1 producers');
    }

    console.log('>>>>> end <<<<<')
    process.exit();
})();