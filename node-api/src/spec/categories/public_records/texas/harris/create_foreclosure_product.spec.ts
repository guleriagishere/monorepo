// import { formattedDate } from '../../../../../core/dateable';

// import TX_Harris_Foreclosure from '../../../../../categories/public_records/texas/harris/foreclosure_product';
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
//         product = new TX_Harris_Foreclosure(fiveDaysAgo, currentDate);
//     });

//     it('creates :public_records :texas :harris foreclosure', async () => {
//         const resp = await product.startParsing();
        
//         //confirm success is true
//         expect(resp).toEqual(true);
//     });
// });