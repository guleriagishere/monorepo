import AbstractProducer from '../../../abstract_producer';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.seattle.gov/resource/ez4a-iug7.json?statuscurrent=Initiated',
          'https://data.seattle.gov/resource/rsmq-5vwm.json?statuscurrent=Initiated'
      ]
    };

    async init(): Promise<boolean> {
      return true;
    };
    async read(): Promise<boolean> {
      return true;
    };

    async parseAndSave(): Promise<boolean> {
        let countRecords = 0;
        let offset = await this.getOffset(this.urls.api_url.length);
        
        for (let i = 0 ; i < this.urls.api_url.length ; i++) {
            let url = this.urls.api_url[i];
            try {
                let limit = 1000;
                while (true) {
                    const response = await this.getCodeViolationData(url, limit, offset[i]);
                    if (response.success) {
                        switch (i) {
                            case 0:
                                countRecords += await this.handleData(response.data, 'Code Complaints and Violations');
                                break;
                            case 1:
                                countRecords += await this.handleData(response.data, 'Code Complaints and Violations Map');
                                break;
                        }
                        offset[i] += response.data.length;
                        if (response.end) break;
                        await this.sleep(this.getRandomInt(1000, 2000));
                    }
                    else {
                        break;
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }
        await this.updateOffset(offset);

        console.log('saved: ' + countRecords)
        await AbstractProducer.sendMessage(this.publicRecordProducer.state, this.publicRecordProducer.county ? this.publicRecordProducer.county : this.publicRecordProducer.city, countRecords, 'Code Violation');
        return true;
    }

    async handleData(data: any, caseType: string) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.originaladdress1
            const fillingDate = record.opendate;
            const zip = record.originalzip;
            const caseNumber = record.recordnum;

            const res = {
                address: propertyAddress,
                zip: zip,
                caseType,
                caseNumber,
                fillingDate,
                state: this.publicRecordProducer.state,
                county: this.publicRecordProducer.county
            }                    
            if (await this.checkAndSave(res))
                countRecords++;
        }
        return countRecords;
    }
}