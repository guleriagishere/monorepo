// import { 
//     callGraphql
// } from '../../../../helpers/spec_helper';

// import { formattedDate } from '../../../../../core/dateable';

// const createLineItems = `
//     mutation createLineItems($categoryName: String, $productNames: [String], $dateRange: String) {
//         createLineItems(categoryName: $categoryName, productNames: $productNames, dateRange: $dateRange){
//             success
//             response
//       }
//     }
// `;

// beforeAll(async () => {
// });

// afterAll(async () => {
// });

// describe('#createLineItems', () => {
//     let data: any;
//     const currentDate: string = formattedDate(new Date());
//     const date = new Date();
//     const fiveDaysAgo = formattedDate(new Date(date.setDate(date.getDate() - 5)));

//     beforeEach( () => {
//         data = {
//             categoryName: 'public_records',
//             productNames: ['/florida/broward/foreclosure'],
//             dateRange: `${fiveDaysAgo} - ${currentDate}`
//         }
//     });

//     it('creates :public_records :florida :broward line_items', async () => {
//         const resp = await callGraphql(createLineItems, data);

//         //confirm success is true
//         expect(resp).toEqual({});
//     });
// });