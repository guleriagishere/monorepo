import puppeteer from 'puppeteer';
import db from '../../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.cityofgainesville.org/resource/vu9p-a5f7.json?status=Opened',
          'https://data.cityofgainesville.org/resource/mbv5-fyig.json?status=Opened',
          'https://data.cityofgainesville.org/resource/y6su-758z.json?status=Opened',
          'https://data.cityofgainesville.org/resource/vt4i-fx67.json?status=Opened'
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
                                countRecords += await this.handleData(response.data, 'Code Complaints & Violations');
                                break;
                            case 1:
                                countRecords += await this.handleData(response.data, 'Heat Map of House Code Violations');
                                break;
                            case 2:
                                countRecords += await this.handleData(response.data, 'Where Top 3 Code Violations Occur');
                                break;
                            case 3:
                                countRecords += await this.handleData(response.data, 'Top Three Violations');
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
            const fillingDate = record.compliance_date;
            const zip = '';
            const caseNumber = record.number;

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