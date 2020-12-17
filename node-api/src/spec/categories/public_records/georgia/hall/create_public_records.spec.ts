// import GA_Hall_public_records from '../../../../../categories/public_records/consumers/property_appraisers/georgia/hall/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// beforeAll(async () => {
// });

// afterAll(async () => {
// });

// describe('=== TESTing PA SCRIPT - Hall, GA ===', () => {
//     let product: AbstractProduct;
//     const state = "Georgia";
//     const county = "Hall";

//     describe('= search by name', () => {
//       beforeEach( () => {
//           product = new GA_Hall_public_records(state, county);
//       });

//       it('update :georgia :hall public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });

//     describe('= search by address', () => {
//       beforeEach( () => {
//           product = new GA_Hall_public_records(state, county);
//       });

//       it('update :georgia :hall public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });
// });