// import { formattedDate } from '../../../../../core/dateable';

// import TX_Harris_Tax_Lien from '../../../../../categories/public_records/texas/harris/tax_lien_product';
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
//         product = new TX_Harris_Tax_Lien(fiveDaysAgo, currentDate);
//     });

//     it('creates :public_records :texas :harris tax_lien', async () => {
//         const resp = await product.startParsing();
        
//         //confirm success is true
//         expect(resp).toEqual(true);
//     });
// });