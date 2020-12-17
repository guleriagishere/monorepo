require('dotenv').config();
import db from '../../models/db';

( async () => {
  const doctype_to_practicetype: any = {
    '(DOR) Administrative Support Order': '',
    '(DOR) Dependent Support Enforcement': '',
    '(DOR) UIFSA Interstate Support': '',
    '90 Day Extension': '',
    'A/J': '',
    'ABANDONMENT OF EASEMENT': '',
    'ABNDN': '',
    'ABSTRACT JUDGMENT': '',
    'ABSTRACT JUDGMENT - AMENDED': '',
    'ABSTRACT JUDGMENT - RELEASE': '',
    'ABSTRACT OF ASSESSMENT': '',
    'ABSTRACT OF JUDGMENT': '',
  };

  const normalizeStringForMongo = (sourceString: string) => {
    return sourceString.toLocaleLowerCase().replace('_', '-').replace(/[^A-Z\d\s\-]/ig, '').replace(/\s+/g, '-');
  }

  const productIds: any = {};
  (await db.models.Product.find()).forEach((doc: any) => {
    productIds[doc.name] = doc._id;
  });

  //@ts-ignore 
  const cursor = db.models.OwnerProductProperty.find({ originalDocType: {$exists: true} }).populate('ownerId propertyId').cursor({batchSize: 20}).addCursorFlag('noCursorTimeout',true);
  for (let opp = await cursor.next(); opp != null; opp = await cursor.next()) {
    // i have validation to ensure either propertyId or ownerId is present, so theoretically this should never happen. However, we did manually remove documents that were junk, thus breaking certain associations
    const practiceType = doctype_to_practicetype[opp.originalDocType.trim()];
    if (practiceType) {
      const county = normalizeStringForMongo(opp.ownerId['County']);
      const state = normalizeStringForMongo(opp.ownerId['Property State']);
      const name = `/${state}/${county}/${practiceType.toLocaleLowerCase()}`;
      if (productIds[name] && opp.productId !== productIds[name]) {
        opp.productId = productIds[name];
        await opp.save();
      }
    }
  }
  process.exit();
})();