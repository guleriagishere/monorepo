// import Tx_Travis_public_records from '../../../../../categories/public_records/consumers/property_appraisers/tx/travis/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';
// import CivilProducer from '../../../../../categories/public_records/producers/civil/tx/travis/civil_producer';
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
//     const publicRecordProducer = await db.models.PublicRecordProducer.findOne({ source: 'civil', county: 'travis', state: 'TX' });
//     producer = new CivilProducer(publicRecordProducer);

//     async function createOwner(): Promise<any> {
//         let productName = '/tx/travis/other-civil';
//         const prod = await db.models.Product.findOne({ name: productName }).exec();
//         const doc = {
//             "Full Name": 'TORRES REYNALDO',
//             "First Name": 'REYNALDO',
//             "Last Name": 'TORRES',
//             "Middle Name": '',
//             "Name Suffix": '',
//             "fillingDate": '09/21/2020',
//             "productId": prod._id,
//             "County": "travis",
//             "practiceType": 'other-civil',
//             "propertyAppraiserProcessed": false,
//             "vacancyProcessed": false,
//             'Property State': 'TX'
//         }
//         await producer.civilAndLienSaveToNewSchema(doc);
//     }
//     async function createProperty(): Promise<any> {
//         let productName = '/tx/travis/other-civil';
//         const prod = await db.models.Product.findOne({ name: productName }).exec();
//         const doc = {
//             'Property State': 'TX',
//             'Property Address': '1601 Gaylord Dr',
//             'Property Unit #': '',
//             'Property City': 'Austin',
//             'Property Zip': '78728',
//             "fillingDate": '09/21/2020',
//             "productId": prod._id,
//             "County": "travis",
//             "practiceType": 'other-civil',
//             "propertyAppraiserProcessed": false,
//             "vacancyProcessed": false,
//         }
//         await producer.civilAndLienSaveToNewSchema(doc);
//     }
//     await createOwner(); // Create a record for owner
//     await createProperty(); // Create a record for property
// });

// afterAll(async () => {
// });

// describe('=== TESTING PA SCRIPT - Travis, TX ===', () => {
//     let product: AbstractProduct;
//     const state = "Texas";
//     const county = "Travis";

//     describe('= search by name', () => {
//       beforeEach( async () => {
//           product = new Tx_Travis_public_records(state, county, practiceTypes, 'property-appraiser-consumer');
//       });

//       it('update :texas :travis new schema', async () => {
//           const resp = await product.startParsing();
//           const owner = await db.models.Owner.findOne({'Full Name': 'TORRES REYNALDO', 'County': 'travis', 'Property State': 'TX'}).exec();
//           const ownerProductProperty = await db.models.OwnerProductProperty.findOne({'ownerId': owner._id, 'propertyId': {$ne: null}}).exec();
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
//           product = new Tx_Travis_public_records(state, county, practiceTypes, 'property-appraiser-consumer');
//       });

//       it('update :texas :travis new schema', async () => {
//           const resp = await product.startParsing();
//           const property = await db.models.Property.findOne({'Property Address': '1601 Gaylord Dr', 'County': 'travis', 'Property State': 'TX'}).exec();
//           const ownerProductProperty = await db.models.OwnerProductProperty.findOne({'propertyId': property._id, 'ownerId': {$ne: null}}).exec();
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

// // import TX_Travis_public_records from '../../../../../categories/public_records/consumers/property_appraisers/texas/travis/pa_consumer';
// // import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// // beforeAll(async () => {
// // });

// // afterAll(async () => {
// // });

// // describe('=== TESTing PA SCRIPT - Travis, TX ===', () => {
// //     let product: AbstractProduct;
// //     const state = "Texas";
// //     const county = "Travis";

// //     describe('= search by name', () => {
// //       beforeEach( () => {
// //           product = new TX_Travis_public_records(state, county);
// //       });

// //       it('update :georgia :travis public_record_line_item', async () => {
// //           const resp = await product.startParsing();
          
// //           //confirm success is true
// //           expect(resp).toEqual(true);
// //       });
// //     });

// //     describe('= search by address', () => {
// //       beforeEach( () => {
// //           product = new TX_Travis_public_records(state, county);
// //       });

// //       it('update :georgia :travis public_record_line_item', async () => {
// //           const resp = await product.startParsing();
          
// //           //confirm success is true
// //           expect(resp).toEqual(true);
// //       });
// //     });
// // });