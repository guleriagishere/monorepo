// import AZ_Coconino_public_records from '../../../../../categories/public_records/consumers/property_appraisers/arizona/coconino/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// beforeAll(async () => {
// });

// afterAll(async () => {
// });

// describe('=== TESTing PA SCRIPT - Coconino, FL ===', () => {
//     let product: AbstractProduct;
//     const state = "Arizona";
//     const county = "Coconino";

//     describe('= search by name', () => {
//       beforeEach( () => {
//           product = new AZ_Coconino_public_records(state, county);
//       });

//       it('update :arizona :coconino public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });

//     describe('= search by address', () => {
//       beforeEach( () => {
//           product = new AZ_Coconino_public_records(state, county);
//       });

//       it('update :arizona :coconino public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });
// });