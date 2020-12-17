import EtlService from '../services/etl_service';
import { IResponse } from '../interfaces/istandard_response';

export default async (req: any, res: any) => {
    let etlResp: IResponse;

    console.log(`Scheduler triggered to update Master Query at ${new Date().toISOString()}`);

    const etlService: EtlService = new EtlService('master_queries');
    const success: boolean | null = await etlService.createTable();

    if(success) {
        etlResp = {
            statusCode: 200,
            body: { 
                resp: 'Request Processed',
                success: true
            }
        };
    } else {
        etlResp = {
            statusCode: 400,
            body: { 
              resp: 'Invalid request',
              success: false
            }
        };
    }

    res.send(etlResp); 
}