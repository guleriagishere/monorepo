// import AZ_Pima_public_records from '../../../../../categories/public_records/consumers/property_appraisers/arizona/pima/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// beforeAll(async () => {
// });

// afterAll(async () => {
// });

// describe('=== TESTing PA SCRIPT - Pima, FL ===', () => {
//     let product: AbstractProduct;
//     const state = "Arizona";
//     const county = "Pima";

//     describe('= search by name', () => {
//       beforeEach( () => {
//           product = new AZ_Pima_public_records(state, county);
//       });

//       it('update :arizona :pima public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });

//     describe('= search by address', () => {
//       beforeEach( () => {
//           product = new AZ_Pima_public_records(state, county);
//       });

//       it('update :arizona :pima public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });
// });