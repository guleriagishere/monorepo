// import GA_Chatham_public_records from '../../../../../categories/public_records/consumers/property_appraisers/georgia/chatham/pa_consumer';
// import AbstractProduct from '../../../../../categories/public_records/consumers/property_appraisers/abstract_pa_consumer_updated';


// beforeAll(async () => {
// });

// afterAll(async () => {
// });

// describe('=== TESTing PA SCRIPT - CHATHAM, GA ===', () => {
//     let product: AbstractProduct;
//     const state = "Georgia";
//     const county = "Chatham";

//     describe('= search by name', () => {
//       beforeEach( () => {
//           product = new GA_Chatham_public_records(state, county);
//       });

//       it('update :georgia :chatham public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });

//     describe('= search by address', () => {
//       beforeEach( () => {
//           product = new GA_Chatham_public_records(state, county);
//       });

//       it('update :georgia :chatham public_record_line_item', async () => {
//           const resp = await product.startParsing();
          
//           //confirm success is true
//           expect(resp).toEqual(true);
//       });
//     });
// });