// import { formattedDate } from '../../../../../core/dateable';

// import TX_Mclennan_Foreclosure from '../../../../../categories/public_records/texas/mclennan/foreclosure_product';
// import AbstractProduct from '../../../../../categories/public_records/abstract_product';


// beforeAll(async () => {
// });

// afterAll(async () => {
// });

// describe('#createLineItems', () => {
//     let product: AbstractProduct;
//     const currentDate: string = formattedDate(new Date());
//     const date = new Date();
//     const fiveDaysAgo = formattedDate(new Date(date.setDate(date.getDate() - 5)));

//     beforeEach( () => {
//         product = new TX_Mclennan_Foreclosure(fiveDaysAgo, currentDate);
//     });

//     it('creates :public_records :texas :mclennan foreclosure', async () => {
//         const resp = await product.startParsing();
        
//         //confirm success is true
//         expect(resp).toEqual(true);
//     });
// });