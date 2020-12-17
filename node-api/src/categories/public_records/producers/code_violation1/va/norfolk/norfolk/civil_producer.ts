import puppeteer from 'puppeteer';
import db from '../../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.norfolk.gov/resource/7qie-z5gv.json?',
          'https://data.norfolk.gov/resource/mxtv-99gh.json?complaint_status=Open'
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
                                countRecords += await this.handleData1(response.data, 'Delinquent Property Taxes');
                                break;
                            case 1:
                                countRecords += await this.handleData2(response.data, 'Neighborhood Quality Code Enforcement Cases');
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

    async handleData1(data: any, caseType: string) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.address;
            const name = record.owner_name;
            const fillingDate = '';
            const zip = '';
            const caseNumber = record.biitem;

            if (propertyAddress) {
                const res1 = {
                    address: propertyAddress,
                    zip: zip,
                    caseType,
                    caseNumber,
                    fillingDate,
                    state: this.publicRecordProducer.state,
                    county: this.publicRecordProducer.county
                }                    
                if (await this.checkAndSave(res1))
                    countRecords++;
            }

            if (name) {
                const res2 = {
                    name,
                    caseType,
                    caseNumber,
                    fillingDate,
                    state: this.publicRecordProducer.state,
                    county: this.publicRecordProducer.county
                }                    
                if (await this.checkAndSave(res2, false))
                    countRecords++;
            }              
        }
        return countRecords;
    }

    async handleData2(data: any, caseType: string) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.complaint_street;
            const fillingDate = record.complaint_created_date;
            const zip = '';
            const caseNumber = record.gpin;

            if (propertyAddress) {
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
        }
        return countRecords;
    }
}