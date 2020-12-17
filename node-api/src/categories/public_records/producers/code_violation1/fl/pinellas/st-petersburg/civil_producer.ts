import puppeteer from 'puppeteer';
import db from '../../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://stat.stpete.org/resource/way3-3q6b.json?case_status_desc=ACTIVE',
          'https://stat.stpete.org/resource/tmdq-gg7f.json?case_status_desc=ACTIVE',
          'https://stat.stpete.org/resource/f65e-u2ih.json'
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
            const propertyAddress = record.address;
            const fillingDate = record.violation_date_established;
            const zip = record.zip_code;
            const caseType = 'Codes Citizen Connect';
            const caseNumber = record.parcel_number;

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
            const propertyAddress = record.address;
            const fillingDate = record.date_case_reported;
            const zip = record.zip_code;
            const caseType = 'Code Cases';
            const caseNumber = record.parcel;

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
            const propertyAddress = record.address;
            const fillingDate = record.case_year;
            const zip = '';
            const caseType = 'Active Neighborhood Association Codes Cases';
            const caseNumber = '';

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