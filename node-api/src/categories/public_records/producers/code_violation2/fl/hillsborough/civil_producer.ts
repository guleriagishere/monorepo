import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import axios from 'axios';
import { countReset } from 'console';

export default class CivilProducer extends AbstractProducer {

    sources =
      [
        { url: 'https://webapps.hillsboroughcounty.org/hcce/resources/onlineservices/enforcement/getcasedetails.cfm?case_number=', handler: this.handleSource1 } 
      ];

    async init(): Promise<boolean> {
        console.log("running init")
        this.browser = await this.launchBrowser();
        this.browserPages.generalInfoPage = await this.browser.newPage();

        await this.setParamsForPage(this.browserPages.generalInfoPage);
        return true;
    };
    async read(): Promise<boolean> {
      return true;
    };

    async parseAndSave(): Promise<boolean> {
        let countRecords = 0;
        let page = this.browserPages.generalInfoPage;
        if (!page) return false;

        for (const source of this.sources) {
            countRecords += await source.handler.call(this, page, source.url);
        }

        await AbstractProducer.sendMessage(this.publicRecordProducer.state, this.publicRecordProducer.county ? this.publicRecordProducer.county : this.publicRecordProducer.city, countRecords, 'Code Violation');
        return true;
    }

    async handleSource1(page: puppeteer.Page, link: string) {
        console.log('============ Checking for ', link);
        let counts = 0;
        let id = 1;
        while (true) {
            // load page
            const _id = id.toString().padStart(6, '0');
            let year: any = (new Date()).getFullYear() % 100;
            year = year.toString().padStart(2, '0');
            const isPageLoaded = await this.openPage(page, `${link}CE${year}${_id}`, '//footer');
            if (!isPageLoaded) {
                console.log('Page loading is failed, trying next...');
                continue;
            }
            const [errorMessage] = await page.$x('//*[contains(text(), "not a valid")]');
            if (errorMessage) {
                break;
            }
            if (await this.getData1(page, id))
                counts++;
            await this.sleep(this.getRandomInt(1000, 2000));
            id++;
        }
        return counts;
    }

    async getData1(page: puppeteer.Page, id: number) {
        let fillingdate = await this.getTextByXpathFromPage(page, '//*[text()="Open Date:"]/following-sibling::text()[1]');
        let property_addresss = await this.getTextByXpathFromPage(page, '//*[text()="Property Address:"]/following-sibling::text()[1]');

        return await this.saveRecord({
            property_addresss,
            fillingdate,
            caseno: id,
        });
    }

    async saveRecord(record: any) {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': record.property_addresss,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            "caseUniqueId": record.caseno.toString(),
            fillingDate: record.fillingdate,
            originalDocType: record.casetype
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}