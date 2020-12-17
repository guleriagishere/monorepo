import puppeteer from 'puppeteer';
import db from '../../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.kcmo.org/resource/nhtf-e75a.json?$order=case_opened%20DESC&status=Open',
          'https://data.kcmo.org/resource/q6e8-cjhh.json?status=Open',
          'https://data.kcmo.org/resource/jf4z-cm5s.json?status=Open'
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
                                countRecords += await this.handleData(response.data, 'Property Violations');
                                break;
                            case 1:
                                countRecords += await this.handleData(response.data, 'Open Property Violations');
                                break;
                            case 2:
                                countRecords += await this.handleData(response.data, 'Open Code Violations');
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
            const propertyAddress = record.address;
            const fillingDate = record.violation_entry_date;
            const zip = record.zip_code;
            const caseNumber = record.case_id;

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