import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.montgomerycountymd.gov/resource/rry5-yaa6.json',
          'https://data.montgomerycountymd.gov/resource/7hsy-2xg7.json',
          'https://data.montgomerycountymd.gov/resource/bw2r-araf.json'
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
            const propertyAddress = record.street_address;
            const fillingDate = record.date_filed;
            const zip = record.zip_code;
            const caseType = 'Housing Code Violatons';
            const caseNumber = record.case_number;

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
            const propertyAddress = record.street_address;
            const fillingDate = record.date_filed;
            const zip = record.zip_code;
            const caseType = 'Housing Code Violation Point Map';
            const caseNumber = record.case_number;

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
            const propertyAddress = record.streetaddress;
            const fillingDate = record.firstinspectiondate;
            const zip = record.zipcode;
            const caseType = 'Troubled Properties Analysis';
            const caseNumber = record.casenumber;

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