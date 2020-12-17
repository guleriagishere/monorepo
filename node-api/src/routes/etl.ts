import EtlService from '../services/etl_service';

export default async (req: any, res: any) => {
    let service: EtlService | undefined;

    if(validRequest(req.body.zoho_etl_record_type)) {
        service = new EtlService(req.body.zoho_etl_record_type);
    }

    console.log(`ETL Request Triggered at ${new Date().toISOString()}`);

    if(service) {
        service.exec(req.body);
        res.send({
            statusCode: 200,
            body: { 
                resp: 'Request Processed',
                success: true
            }
        });
    } else {
        res.send({
            statusCode: 400,
            body: { 
              resp: 'Invalid request',
              success: false
            }
        });
    }
}

const validRequest = (recordType: string): boolean => {
    return [
        'leads',
        'deals'
    ].includes(recordType);
}