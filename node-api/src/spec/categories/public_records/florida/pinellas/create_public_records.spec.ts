// import Fl_Pinellas_public_records from '../../../../../categories/public_records/consumers/property_appraisers/fl/pinellas/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';
// import CivilProducer from '../../../../../categories/public_records/producers/civil/fl/pinellas/civil_producer';
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
//     const publicRecordProducer = await db.models.PublicRecordProducer.findOne({ source: 'civil', county: 'pinellas', state: 'FL' });
//     producer = new CivilProducer(publicRecordProducer); // Instantiate needed to access the civilAndLienSaveToNewSchema method

//     async function createOwner(): Promise<any> {
//         let productName = '/fl/pinellas/auction';
//         const prod = await db.models.Product.findOne({ name: productName }).exec();
//         const doc = {
//             "Full Name": 'WATSON, CHRISTOPHER DAVID',
//             "First Name": 'CHRISTOPHER',
//             "Last Name": 'WATSON',
//             "Middle Name": 'DAVID',
//             "Name Suffix": '',
//             "fillingDate": '20200920',
//             "productId": prod._id,
//             "County": "Pinellas",
//             "practiceType": 'auction',
//             "propertyAppraiserProcessed": false,
//             "vacancyProcessed": false,
//             'caseUniqueId': '18610474',
//             'Property State': 'FL'
//         }
//         await producer.civilAndLienSaveToNewSchema(doc);
//     }
//     async function createProperty(): Promise<any> {
//         let productName = '/fl/pinellas/auction';
//         const prod = await db.models.Product.findOne({ name: productName }).exec();
//         const doc = {
//             'Property State': 'FL',
//             'Property Address': '2125 LITTLE BROOK LN',
//             'Property Unit #': '',
//             'Property City': 'CLEARWATER',
//             'Property Zip': '33763',
//             "fillingDate": '09/21/2020',
//             "productId": prod._id,
//             "County": "Pinellas",
//             "practiceType": 'auction',
//             "propertyAppraiserProcessed": false,
//             "vacancyProcessed": false,
//             'caseUniqueId': '18610474',
//         }
//         await producer.civilAndLienSaveToNewSchema(doc);
//     }
//     await createOwner(); // Create a record for owner
//     await createProperty(); // Create a record for property
// });

// afterAll(async () => {
// });

// describe('=== TESTing PA SCRIPT - Pinellas, FL ===', () => {
//     let product: AbstractProduct;
//     const state = "Florida";
//     const county = "Pinellas";

//     describe('= search by name', () => {
//       beforeEach( () => {
//           product = new Fl_Pinellas_public_records(state, county, practiceTypes, 'property-appraiser-consumer');
//       });

//       it('update :florida :pinellas public_record_line_item', async () => {
//           const resp = await product.startParsing();
//           const owner = await db.models.Owner.findOne({'Full Name': 'WATSON, CHRISTOPHER DAVID', 'County': 'pinellas', 'Property State': 'FL'}).exec();
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
//           product = new Fl_Pinellas_public_records(state, county, practiceTypes, 'property-appraiser-consumer');
//       });

//       it('update :florida :pinellas public_record_line_item', async () => {
//           const resp = await product.startParsing();
//           const property = await db.models.Property.findOne({'Property Address': '2125 LITTLE BROOK LN', 'County': 'pinellas', 'Property State': 'FL'}).exec();
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
// //// OLD SCRIPT
// // import Fl_Pinellas_public_records from '../../../../../categories/public_records/consumers/property_appraisers/florida/pinellas/pa_consumer';
// // import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// // beforeAll(async () => {
// // });

// // afterAll(async () => {
// // });

// // describe('=== TESTing PA SCRIPT - Pinellas, FL ===', () => {
// //     let product: AbstractProduct;
// //     const state = "Florida";
// //     const county = "Pinellas";

// //     describe('= search by name', () => {
// //       beforeEach( () => {
// //           product = new Fl_Pinellas_public_records(state, county);
// //       });

// //       it('update :florida :pinellas public_record_line_item', async () => {
// //           const resp = await product.startParsing();
          
// //           //confirm success is true
// //           expect(resp).toEqual(true);
// //       });
// //     });

// //     describe('= search by address', () => {
// //       beforeEach( () => {
// //           product = new Fl_Pinellas_public_records(state, county);
// //       });

// //       it('update :florida :pinellas public_record_line_item', async () => {
// //           const resp = await product.startParsing();
          
// //           //confirm success is true
// //           expect(resp).toEqual(true);
// //       });
// //     });
// // });