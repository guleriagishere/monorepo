require('dotenv').config();
// import { SQS } from 'aws-sdk';
// import SqsService from './services/sqs_service';
import db from '../models/db';
import { IPublicRecordProducer } from '../models/public_record_producer';
import { IOwnerProductProperty } from '../models/owner_product_property';

async function fetchProduct(productName: string): Promise<any> {
    const {default: Product} = await import(productName);
    return Product;
}

(async () => {

    const data = await db.models.PublicRecordProducer.aggregate([
        { $match: { source: 'property-appraiser-consumer', processed: false  } },
        { $lookup: { from: 'county_priorities', localField: 'countyPriorityId', foreignField: '_id', as: 'county_priorities' }},
        { $unwind: "$county_priorities" },
        { $sort: {'county_priorities.priority': 1}}
    ]).limit(1);

    console.log(data);
    if(data.length > 0) {
        const publicRecordProducer: IPublicRecordProducer = await db.models.PublicRecordProducer.findOneAndUpdate({ _id: data[0]['_id'] }, { processed: true }); 

        const state = publicRecordProducer.state.toLowerCase();
        const county = publicRecordProducer.county;        
        console.log(`county-pa-consumer: now processing county ${county} in state ${state} at ${new Date()}`);

        const regex = `/${state}/${county}/((?!other).)*$`;
        const productIds = (await db.models.Product.find({ name: {$regex: new RegExp(regex, 'gm')} })).map( (doc: any) =>  doc._id );

        // at the moment we cannot use cursors because we are loading all data before navigating to website
        const ownerProductProperties: IOwnerProductProperty[] = await db.models.OwnerProductProperty.find({ propertyAppraiserProcessed: { $ne: true }, productId: {$in: productIds} }).populate('ownerId propertyId');

        console.log('~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ');
        console.log('number of documents to process: ', ownerProductProperties.length);

        try {
            const Product: any = await fetchProduct(`../categories/public_records/consumers/property_appraisers/${state}/${publicRecordProducer.county}/pa_consumer`);
            await new Product(publicRecordProducer, ownerProductProperties).startParsing();
        
        } catch (e) {
            console.log('county_property_appraiser_consume ERROR: ', e);
        }

    } else {
        console.log('==============================');
        console.log('no remaining property-appraiser-consumer');
    };

    process.exit();
})();