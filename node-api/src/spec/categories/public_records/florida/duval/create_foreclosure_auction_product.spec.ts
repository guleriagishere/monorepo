// import { formattedDate } from '../../../../../core/dateable';

// import FL_Duval_Foreclosure_Auction from '../../../../../categories/public_records/florida/duval/foreclosure_auction_product';
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
//         product = new FL_Duval_Foreclosure_Auction(fiveDaysAgo, currentDate);
//     });

//     it('creates :public_records :florida :duval foreclosure_auction', async () => {
//         const resp = await product.startParsing();
        
//         //confirm success is true
//         expect(resp).toEqual(true);
//     });
// });