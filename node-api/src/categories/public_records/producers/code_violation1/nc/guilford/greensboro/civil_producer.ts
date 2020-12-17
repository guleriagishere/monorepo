import puppeteer from 'puppeteer';
import db from '../../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {

    urls = {
      api_url: [
          'https://data.greensboro-nc.gov/resource/v5t4-gjta.json?casestatus=A',
          'https://data.greensboro-nc.gov/resource/whix-gx4j.json?casestatus=A',
          'https://data.greensboro-nc.gov/resource/26hs-mxmu.json?casestatus=A'
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
                                countRecords += await this.handleData1(response.data, 'Code Compliance Case History 2011 - Present');
                                break;
                            case 1:
                                countRecords += await this.handleData2(response.data, 'Code Compliance Cases 2011 - Present');
                                break;
                            case 2:
                                countRecords += await this.handleData3(response.data, 'Code Compliance Violations 2011 - Present');
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
            const propertyAddress = record.fulladdress;
            const fillingDate = record.date;
            const zip = '';
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

    async handleData2(data: any, caseType: string) {
        let countRecords = 0;
        for (const record of data) {                    
            const propertyAddress = record.fulladdress;
            const fillingDate = record.entrydate;
            const zip = '';
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

    async handleData3(data: any, caseType: string) {
        let countRecords = 0;
        for (const record of data) {                    
            let propertyAddress = (record.stnumber ? record.stnumber : '') + ' ' +
                (record.stpfxdir ? record.stpfxdir : '') + ' ' +
                (record.stname ? record.stname : '') + ' ' +
                (record.sttype ? record.sttype : '') + ' ' +
                (record.stapt ? '#' + record.stapt : '');
            propertyAddress = propertyAddress.replace(/\s+/, ' ').trim();
            const fillingDate = record.issueddate;
            const zip = '';
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