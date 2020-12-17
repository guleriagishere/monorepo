import puppeteer from 'puppeteer';
import db from '../../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.nola.gov/resource/3ehi-je3s.json',
          'https://data.nola.gov/resource/u6yx-v2tw.json?o_c=Open',
          'https://data.nola.gov/resource/44ct-56tr.json?o_c=Open',
          'https://data.nola.gov/resource/8pqz-ftzc.json?o_c=Open'
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
                                countRecords += await this.handleData1(response.data);
                                break;
                            case 1:
                                countRecords += await this.handleData2(response.data);
                                break;
                            case 2:
                                countRecords += await this.handleData3(response.data);
                                break;
                            case 3:
                                countRecords += await this.handleData4(response.data);
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

    async handleData1(data: any) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.location;
            const fillingDate = record.violationdate;
            const zip = '';
            const caseType = 'Code Enforcement All Violations';
            const caseNumber = record.caseno;

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

    async handleData2(data: any) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.location;
            const fillingDate = record.casefiled;
            const zip = record.zipcode;
            const caseType = 'Code Enforcement All Cases';
            const caseNumber = record.caseid;

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

    async handleData3(data: any) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.propertyaddress;
            const fillingDate = record.caseestablished;
            const zip = record.zip;
            const caseType = 'Code Enforcement All Hearings';
            const caseNumber = record.caseid;

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

    async handleData4(data: any) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.location;
            const fillingDate = record.casefiled;
            const zip = record.zipcode;
            const caseType = 'Code Enforcement Active Pipeline';
            const caseNumber = record.caseid;

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