import { Request, Response } from "express";
import { IOwner } from './models/owner';
import { IProperty } from './models/property';
import { IProduct } from './models/product';
import { ILineItem } from './models/line_item';
import db from './models/db'; 
import mongoose from 'mongoose';

(async () => {
    let documentsMigrated = 0;
    let updateFailed = 0;
    let documentsParsed = 0;

    const cursor = db.models.LineItem.find({ 
        $and: [ 
                { $or: [{'newSchemaProcessed': { $exists: false }}, {'newSchemaProcessed': false}]},
                { $or: [{'propertyAppraiserProcessed': true}, {'vacancyProcessed': true}]},
        ], 'schemaUpdateFailReason': {$exists: false}
        }).cursor();

    for (let lineitem = await cursor.next(); lineitem != null; lineitem = await cursor.next()) {
        documentsParsed++;

        let lineitemObj = lineitem.toObject();
        // Checking Property part is correct
        try {
            if (!lineitemObj.hasOwnProperty('Property Address') || (lineitemObj['Property Address'].trim().length == 0)) {
                console.warn('Problem with line_item: ' + lineitem._id + ' (Property Address Empty)');
                updateFailed++;
                lineitem['schemaUpdateFailReason'] = 'address';
                await lineitem.save();
                continue;
            }
        } catch (error) {
            console.warn('Problem with line_item: ' + lineitem._id + ' (Property Address Problem : ' + lineitemObj['Property Address'] + ')');
            continue;
        }
        // Checking Owner part is correct
        try {
            if (!lineitemObj.hasOwnProperty('Full Name') || (lineitemObj['Full Name'].trim().length == 0)) {
                console.warn('Problem with line_item: ' + lineitem._id + ' (Full Name empty)');
                updateFailed++;
                lineitem['schemaUpdateFailReason'] = 'name';
                await lineitem.save();
                continue;
            }
        } catch (error) {
            console.warn('Problem with line_item: ' + lineitem._id + ' (Full Name Problem : ' + lineitemObj['Full Name'] + ')');
            continue;
        }

        let _property = await db.models.Property.findOne({ 
            'Property Address': lineitemObj['Property Address'],
            'Property Unit #': lineitemObj['Property Unit #'],
            'Property Zip': lineitemObj['Property Zip'],
        }).exec();  
    
        if (_property?._id) {
            if (_property.productId !== lineitemObj['productId']) {
                if (!_property.productIds_old.includes(lineitemObj['productId'])) {
                    _property.productIds_old.push(_property.productId);
                    _property.productId = lineitemObj['productId'];
                    await _property.save();
                }
            }
        } else {
            const property = new db.models.Property(lineitemObj);
            property.owners = [];
            property['productIds_old'] = [];
            _property = await property.save();
        }

        if (_property?._id) {
            const _owner = await db.models.Owner.findOne({ 
                'Full Name': lineitemObj['Full Name'],
                'Mailing Address': lineitemObj['Mailing Address'],
                'Mailing Unit #': lineitemObj['Mailing Unit #'],
                'Mailing City': lineitemObj['Mailing City'],
                'Mailing State': lineitemObj['Mailing State'],
            }).exec();

            if (_owner?._id) {
                if (!_owner.productIds.includes(lineitemObj['productId'])) {
                    _owner.productIds.push(lineitemObj['productId']);
                    await _owner.save();
                }

                if (! _owner.properties.includes(_property._id)) {
                    _owner.properties.push(_property._id);
                    await _owner.save();
                }

                if (! _property.owners.includes(_owner._id)) {
                    _property.owners.push(_owner._id);
                    await _property.save();
                }
            } else {
                const owner = new db.models.Owner(lineitemObj);
                owner.properties = [ _property._id ];
                owner.productIds = [ lineitemObj['productId']];

                let _owner = await owner.save();

                if (_owner) {
                    _property.owners.push(_owner._id);
                    await _property.save();
                }
            }

            lineitem.newSchemaProcessed = true;
            await lineitem.save();

            documentsMigrated++;
        }
    }

    console.log(`Total documents parsed: ${documentsParsed}`);
    console.log(`   Migrated ${documentsMigrated} documents.`);
    console.log(`   Updated failed on ${updateFailed} documents.`);

    await mongoose.disconnect();
})();
