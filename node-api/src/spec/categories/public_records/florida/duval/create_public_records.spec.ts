// import Fl_Duval_public_records from '../../../../../categories/public_records/consumers/property_appraisers/fl/duval/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';
// import CivilProducer from '../../../../../categories/public_records/producers/civil/fl/clay/civil_producer';
// import db from '../../../../../models/db';

// const practiceTypes = [
//     'foreclosure',
//     'preforeclosure',
//     'bankruptcy',
//     'tax-lien',
//     'auction',
//     'inheritance',
//     'probate',
//     'eviction',
//     'hoa-lien',
//     'irs-lien',
//     'mortgage-lien',
//     'pre-inheritance',
//     'pre-probate',
//     'divorce',
//     'tax-delinquency',
//     'code-violation',
//     'absentee-property-owner',
//     'vacancy',
//     'debt',
//     'personal-injury',
//     'marriage',
//     'other-civil'
// ];

// beforeAll(async () => {
//     let producer: CivilProducer;
//     const publicRecordProducer = await db.models.PublicRecordProducer.findOne({ source: 'civil', county: 'duval', state: 'FL' });
//     producer = new CivilProducer(publicRecordProducer); // Instantiate needed to access the civilAndLienSaveToNewSchema method

//     async function createOwner(): Promise<any> {
//         let productName = '/fl/duval/auction';
//         const prod = await db.models.Product.findOne({ name: productName }).exec();
//         const doc = {
//             "Full Name": 'SASSNETT GRADY L III',
//             "First Name": 'GRADY',
//             "Last Name": 'SASSNETT',
//             "Middle Name": 'L',
//             "Name Suffix": 'III',
//             "fillingDate": '09/21/2020',
//             "productId": prod._id,
//             "County": "Duval",
//             "practiceType": 'auction',
//             "propertyAppraiserProcessed": false,
//             "vacancyProcessed": false,
//             'caseUniqueId': '8180891',
//             'Property State': 'FL'
//         }
//         await producer.civilAndLienSaveToNewSchema(doc);
//     }
//     async function createProperty(): Promise<any> {
//         let productName = '/fl/duval/other-civil';
//         const prod = await db.models.Product.findOne({ name: productName }).exec();
//         const doc = {
//             'Property State': 'FL',
//             'Property Address': '3612 BROCKWAY ROAD',
//             'Property Unit #': '',
//             'Property City': 'JACKSONVILLE BEACH',
//             'Property Zip': '32250',
//             "fillingDate": '09/21/2020',
//             "productId": prod._id,
//             "County": "Duval",
//             "practiceType": 'other-civil',
//             "propertyAppraiserProcessed": false,
//             "vacancyProcessed": false,
//             'caseUniqueId': '8180891',
//         }
//         await producer.civilAndLienSaveToNewSchema(doc);
//     }
//     await createOwner(); // Create a record for owner
//     await createProperty(); // Create a record for property
// });

// afterAll(async () => {
// });

// describe('=== TESTing PA SCRIPT - Duval, FL ===', () => {
//     let product: AbstractProduct;
//     const state = "Florida";
//     const county = "Duval";

//     describe('= search by name', () => {
//       beforeEach( () => {
//           product = new Fl_Duval_public_records(state, county, practiceTypes, 'property-appraiser-consumer');
//       });

//       it('update :florida :duval public_record_line_item', async () => {
//           const resp = await product.startParsing();
//           const owner = await db.models.Owner.findOne({'Full Name': 'SASSNETT GRADY L III', 'County': 'duval', 'Property State': 'FL'}).exec();
//           const ownerProductProperty = await db.models.OwnerProductProperty.findOne({'ownerId': owner._id, 'propertyId': {$ne:null}}).exec();
//           const property = await db.models.Property.findOne({'_id': ownerProductProperty.propertyId}).exec();
          
//           let filledbyPA = false;
//           if(property['Property Address'] && property['Last Sale Recording Date']){
//             filledbyPA = true;
//           }
          
//           //confirm success is true
//           expect(filledbyPA).toEqual(true);
//       });
//     });

//     describe('= search by address', () => {
//       beforeEach( () => {
//           product = new Fl_Duval_public_records(state, county, practiceTypes, 'property-appraiser-consumer');
//       });

//       it('update :florida :duval public_record_line_item', async () => {
//           const resp = await product.startParsing();
//           const property = await db.models.Property.findOne({'Property Address': '3612 BROCKWAY ROAD', 'County': 'duval', 'Property State': 'FL'}).exec();
//           const ownerProductProperty = await db.models.OwnerProductProperty.findOne({'propertyId': property._id, 'ownerId': {$ne:null}}).exec();
//           const owner = await db.models.Owner.findOne({'_id': ownerProductProperty.ownerId}).exec();
          
//           let filledbyPA = false;
//           if(owner['Full Name']){
//             filledbyPA = true;
//           }
//           //confirm success is true
//           expect(filledbyPA).toEqual(true);
//       });
//     });
// });

// /////// OLD SCRIPT
// // import Fl_Duval_public_records from '../../../../../categories/public_records/consumers/property_appraisers/florida/duval/pa_consumer';
// // import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// // beforeAll(async () => {
// // });

// // afterAll(async () => {
// // });

// // describe('=== TESTing PA SCRIPT - Duval, FL ===', () => {
// //     let product: AbstractProduct;
// //     const state = "Florida";
// //     const county = "Duval";

// //     describe('= search by name', () => {
// //       beforeEach( () => {
// //           product = new Fl_Duval_public_records(state, county);
// //       });

// //       it('update :florida :duval public_record_line_item', async () => {
// //           const resp = await product.startParsing();
          
// //           //confirm success is true
// //           expect(resp).toEqual(true);
// //       });
// //     });

// //     describe('= search by address', () => {
// //       beforeEach( () => {
// //           product = new Fl_Duval_public_records(state, county);
// //       });

// //       it('update :florida :duval public_record_line_item', async () => {
// //           const resp = await product.startParsing();
          
// //           //confirm success is true
// //           expect(resp).toEqual(true);
// //       });
// //     });
// // });