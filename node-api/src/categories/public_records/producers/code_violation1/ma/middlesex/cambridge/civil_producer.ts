import puppeteer from 'puppeteer';
import db from '../../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.cambridgema.gov/resource/u8qu-4xy9.json?code_case_status=Active'
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
                        countRecords += await this.handleData(response.data);
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

    async handleData(data: any) {
        let countRecords = 0;
        for (const record of data) {
            const propertyAddress = JSON.parse(record.address.human_address).address;
            const zip = '';
            const fillingDate = record.cited;
            const caseType = 'Housing Code Violations (105 CMR 410.000)';
            const caseNumber = record.parcel;

            const res = {
                address: propertyAddress,
                zip,
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