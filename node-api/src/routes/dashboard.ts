// for the most part the dashboard is handled with GraphQL
// however we have some specifialized use cases where we need to export millions of records at once
// consequently, we use express endpoint to send csv file to client
import { verifyToken } from '../services/jwt_service';
import db from '../models/db';

const csv = require('csv');

export default class Dashboard {
    async export(req: any, res: any) {
        // const token = req.query.token;
        // const validate: any = await verifyToken(token);

        if (true) {
            const filters =  req.query.filters ? JSON.parse(req.query.filters) : []
            const from = req.query.from;
            const to = req.query.to;
            let filterProperty:any = {}
            for (let i = 0; i < filters.length; i++) {
                filterProperty[filters[i][0]] = {$regex:filters[i][1]}
            }

            console.log('the from date: ', from);
            console.log('the to date: ', to);
 
            const transformer = (doc: any)=> {
                console.log(doc)
                return {
                    'Full Name': doc['ownerId']?.['Full Name'],
                    'First Name': doc['ownerId']?.['First Name'],
                    'Last Name': doc['ownerId']?.['Last Name'],
                    'Property Address': doc['propertyId']?.['Property Address'],
                    'Property Unit #': doc['propertyId']?.['Property Unit #'],
                    'Property City': doc['propertyId']?.['Property City'],
                    'Property State': doc['propertyId']?.['Property State'],
                    'Property Zip': doc['propertyId']?.['Property Zip'],
                    'Last Sale Recording Date': doc['propertyId']?.['Last Sale Recording Date'],
                    practiceType: doc['productId']?.['name']?.split('/')?.[3],
                    'Original Doc Type': doc['originalDocType'] || '',
                    'Filling Date': doc['fillingDate'] || ''
                }
            };

            const cursor = db.models.OwnerProductProperty.find({
                createdAt: {
                    $gte: new Date(new Date(from).setHours(0, 0, 0)),
                    $lt: new Date(new Date(to).setHours(23, 59, 59))
                },
                ownerId: {$ne: null},
                propertyId: {$ne: null},
                ...filterProperty
            }).populate('ownerId propertyId productId').cursor(); 
            const filename = 'export.csv';
          
            res.setHeader('Content-disposition', `attachment; filename=${filename}`);
            res.writeHead(200, { 'Content-Type': 'text/csv' });
          
            res.flushHeaders();
          
            cursor.pipe(csv.transform(transformer))
            .pipe(csv.stringify({header: true}))
            .pipe(res)

        }
    }
}



