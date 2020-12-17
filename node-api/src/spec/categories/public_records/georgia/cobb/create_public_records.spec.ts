// import GA_Cobb_public_records from '../../../../../categories/public_records/consumers/property_appraisers/georgia/cobb/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// beforeAll(async () => {
// });

// afterAll(async () => {
// });

// describe('=== TESTing PA SCRIPT - Cobb, GA ===', () => {
//     let product: AbstractProduct;
//     const state = "Georgia";
//     const county = "Cobb";

//     describe('= search by name', () => {
//       beforeEach( () => {
//           product = new GA_Cobb_public_records(state, county);
//       });

//       it('update :georgia :cobb public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });

//     describe('= search by address', () => {
//       beforeEach( () => {
//           product = new GA_Cobb_public_records(state, county);
//       });

//       it('update :georgia :cobb public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });
// });