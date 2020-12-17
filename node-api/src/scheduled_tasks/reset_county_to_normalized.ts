require('dotenv').config();
import db from '../models/db';

( async () => {

    const normalizeStringForMongo = (sourceString: string) => {
      return sourceString.toLocaleLowerCase().replace('_', '-').replace(/[^A-Z\d\s\-]/ig, '').replace(/\s+/g, '-');
    }

    // OwnerProductProperty
    console.log('processing owner_product_properties...');
    let cursor = await db.models.OwnerProductProperty.find({
      landgridPropertyAppraiserProcessed: {$ne: true}, ownerId: {$ne: null}, propertyId: {$ne: null}
    }).cursor();

    for (let owner_product_property = await cursor.next(); owner_product_property != null; owner_product_property = await cursor.next()) {
      owner_product_property.landgridPropertyAppraiserProcessed = true;
      await owner_product_property.save();
    }

    // OwnerProductProperty
    console.log('processing owner_product_properties...');
    cursor = await db.models.OwnerProductProperty.find({
      landgridPropertyAppraiserProcessed: true, $or: [{ownerId: null}, {propertyId: null}], reason_for_failed_pa: null
    }).cursor();

    for (let owner_product_property = await cursor.next(); owner_product_property != null; owner_product_property = await cursor.next()) {
      owner_product_property.landgridPropertyAppraiserProcessed = false;
      await owner_product_property.save();
    }

    // Owner
    console.log('processing owners...');
    cursor = await db.models.Owner.find({
            County: { $regex: /[A-Z]/ }
    }).cursor();

    for (let owner = await cursor.next(); owner != null; owner = await cursor.next()) {
        owner.County = normalizeStringForMongo(owner.County);
        const owner1 = await db.models.Owner.findOne({
          County: owner.County,
          'Full Name': owner['Full Name'],
          'Property State': owner['Property State']
        });
        if (owner1) {
          await owner.remove();
        } else
          await owner.save();
    }

    // Property
    console.log('processing properties...');
    cursor = await db.models.Property.find({
      County: { $regex: /[A-Z]/ }
    }).cursor();

    for (let property = await cursor.next(); property != null; property = await cursor.next()) {
        property.County = normalizeStringForMongo(property.County);
        const property1 = await db.models.Property.findOne({
          County: property.County,
          'Property Address': property['Property Address'],
          'Property State': property['Property State']
        });
        if (property1)
          await property.remove();
        else
          await property.save();
    }

    process.exit();
})();