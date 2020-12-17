// import { formattedDate } from '../../../../../core/dateable';

// import OH_Franklin_Tax_Lien from '../../../../../categories/public_records/ohio/franklin/tax_lien_product';
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
//         product = new OH_Franklin_Tax_Lien(fiveDaysAgo, currentDate);
//     });

//     it('creates :public_records :ohio :franklin tax_lien', async () => {
//         const resp = await product.startParsing();
        
//         //confirm success is true
//         expect(resp).toEqual(true);
//     });
// });