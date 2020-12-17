import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import axios from 'axios';
import { countReset } from 'console';

export default class CivilProducer extends AbstractProducer {

    sources =
      [
        {url: 'http://www.longbeach.gov/lbds/enforcement/current-open-cases/', handler: this.handleSource1 }
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

        await page.setDefaultTimeout(60000);
        for (const source of this.sources) {
            countRecords += await source.handler.call(this, page, source.url);
        }

        await AbstractProducer.sendMessage(this.publicRecordProducer.state, this.publicRecordProducer.county ? this.publicRecordProducer.county : this.publicRecordProducer.city, countRecords, 'Code Violation');
        return true;
    }

    async handleSource1(page: puppeteer.Page, link: string) {
        console.log('============ Checking for ', link);
        let counts = 0;
        // load page
        const isPageLoaded = await this.openPage(page, link, '//*[contains(@class, "panel")]/a');
        if (!isPageLoaded) {
            console.log('Page loading is failed, trying next...');
            return 0;
        }
        const link_handles = await page.$x('//*[contains(@class, "panel")]/a');
        const links: string[] = [];
        for (const link_handle of link_handles) {
            const link = await page.evaluate(el => el.href, link_handle);
            links.push(link);
        }
        for (const link of links) {
            const isPageLoaded = await this.openPage(page, link, '//*[contains(text(), "Active Code Enforcement Cases")]');
            if (!isPageLoaded) {
                console.log('Page loading is failed, trying next...');
                continue;
            }
            // get results
            counts += await this.getData1(page);                
        }
        return counts;
    }

    async getData1(page: puppeteer.Page) {
        let counts = 0;
        let fillingdates = await page.$x('//*[text()="Start Date:"]/following-sibling::td[1]');
        let addresses = await page.$x('//*[text()="Address:"]/following-sibling::td[1]');
        let casetypes = await page.$x('//*[text()="Description:"]/following-sibling::td[1]');
        let casenumbers = await page.$x('//*[text()="Case #:"]/following-sibling::td[1]');
        for (let i = 0 ; i < fillingdates.length ; i++) {
            let property_address: any = await addresses[i].evaluate(el => el.textContent);
            property_address = property_address?.replace(/\s+|\n/gm, ' ').trim();
            let fillingdate: any = await fillingdates[i].evaluate(el => el.textContent);
            fillingdate = fillingdate?.replace(/\s+|\n/gm, ' ').trim();
            let casetype: any = await casetypes[i].evaluate(el => el.textContent);
            casetype = casetype?.replace(/\s+|\n/gm, ' ').trim();
            let caseno: any = await casenumbers[i].evaluate(el => el.textContent);
            caseno = caseno?.replace(/\s+|\n/gm, ' ').trim();
            if (await this.saveRecord({
                property_address,
                fillingdate,
                casetype,
                caseno
            })) {
                counts++;
            }
        }        
        return counts;
    }

    async saveRecord(record: any) {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': record.property_address,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            "caseUniqueId": record.caseno,
            fillingDate: record.fillingdate,
            originalDocType: record.casetype
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}