import EtlService from '../../services/etl_service';

import {
   ZohoLeadData,
   ZohoUpdatedLeadData,
   ZohoDealData,
   ZohoUpdatedDealData
} from '../factories/zoho_etl_factory';

// docker run -p 3306:3306 scrapetorium-api ./cloud_sql_proxy -instances=total-method-280600:us-central1:homesalesclub:us-cent=tcp:3306 -credential_file=total-method-280600-05a5819088bb.json & sleep 1 && npx jest -i src/spec/services/etl_service.spec.ts
describe('Zoho ETL Service', () => {
   describe('table presence', () => {
      let etlService: EtlService;
      beforeEach( () => {
         etlService = new EtlService('leads');
      });

      it('checks table does not exist', async () => {
         const unknownTable = new EtlService('apple_sauces');
         const tableExists = await unknownTable.tableExists();
         expect(tableExists).toBe(false);
      })
      
      it('creates table', async () => {
         let tableExists = await etlService.tableExists();

         if(!tableExists) {
            await etlService.createTable();
            tableExists = await etlService.tableExists();
         }

         expect(tableExists).toBe(true);
      })
   })

   describe('when zoho_etl_record_type is :leads', () => {
      let etlService: EtlService;
      beforeEach( () => {
         etlService = new EtlService('leads');
      });

      it('creates record', async () => {
         const resp: boolean = await etlService.exec(ZohoLeadData);
         expect(resp).toEqual(true);
      })

      it('updates record on duplicate key', async () => {
         const create: boolean = await etlService.exec(ZohoLeadData);
         const update: boolean = await etlService.exec(ZohoUpdatedLeadData);
         expect(update).toEqual(true);
      })

      it('removes failed columns', async () => {
         const columnNames = await etlService.columnNames();
         const data = {
            "Global_ID":"Z4SL7EG9LNN0EABIK3QQM03PXY32SZZ7",
            'apple_sauce': 'tasty',
            'grape_fruit': 'sour'
         }

         const resp: { [key: string]: any} = etlService.removeFailedSchemaColumns(columnNames, data);
         expect(resp['Global_ID']).toEqual("Z4SL7EG9LNN0EABIK3QQM03PXY32SZZ7");
         expect(resp['apple_sauce']).toBeUndefined();
      })
   })

   describe('when zoho_etl_record_type is :deals', () => {
      let etlService: EtlService;
      beforeEach( () => {
         etlService = new EtlService('deals');
      });

      it('creates record', async () => {
         const resp: boolean = await etlService.exec(ZohoDealData);
         expect(resp).toEqual(true);
      })


      it('updates record on duplicate key', async () => {
         const create: boolean = await etlService.exec(ZohoDealData);
         const update: boolean = await etlService.exec(ZohoUpdatedDealData);
         expect(update).toEqual(true);
      })
   })

   describe('when zoho_etl_record_type is :master_queries', () => {
      let etlService: EtlService;
      beforeEach( () => {
         etlService = new EtlService('master_queries');
      });
      
      it('creates record', async () => {
         const resp: boolean | null = await etlService.createTable();
         expect(resp).toEqual(true);
      })
   })

   afterAll(async done => {
      done();
   });
})