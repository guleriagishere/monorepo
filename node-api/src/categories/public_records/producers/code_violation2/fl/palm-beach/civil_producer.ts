import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import axios from 'axios';
import { countReset } from 'console';

export default class CivilProducer extends AbstractProducer {

    sources =
      [
        {url: 'http://onestopshop.wpbgov.com/egovplus/code/codeenf.aspx', handler: this.handleSource1 }
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

    async openPage(page: puppeteer.Page, link: string, xpath: string) {
        try {
            await page.goto(link, {waitUntil: 'load'});
            await page.$x(xpath);
            return true;
        } catch (error) {
            return false;
        }
    }

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
        for (let month = 1 ; month < 13 ; month++) {
            // load page
            const isPageLoaded = await this.openPage(page, link, '//*[@name="case_no"]');
            if (!isPageLoaded) {
                console.log('Page loading is failed, trying next...');
                continue;
            }
            await this.setSearchCriteria1(page, month);               
            // click search button
            await Promise.all([
                page.click('input[value="SEARCH"]'),
                page.waitForNavigation()
            ]);
            const [noresult] = await page.$x('//*[contains(text(), "No matching records found.")]');
            if (noresult) continue;

            await page.waitForXPath('//*[@class="search_results"]/tbody/tr[position()>1]/td[1]/a');
            // get results
            counts += await this.getData1(page);
            await this.sleep(3000);
        }
        return counts;
    }

    async setSearchCriteria1(page: puppeteer.Page, month: number) {
        // get year
        let year = (new Date()).getFullYear();
        // page loaded successfully
        let [input_handle] = await page.$x('//*[@name="case_no"]');
        let search_str = (year % 100).toString().padStart(2, '0') + month.toString().padStart(2, '0');
        await input_handle.type(`CE${search_str}`, {delay: 100});
    }

    async getData1(page: puppeteer.Page) {
        let counts = 0;
        const rows = await page.$x('//*[@class="search_results"]/tbody/tr[position()>1]/td[1]/a');
        const links = [];
        for (const row of rows) {
            let link = await page.evaluate(el => el.href, row);
            links.push(link);
        }
        for (const link of links) {
            await this.openPage(page, link, '//*[@class="search_results"]');
            let caseno = await this.getTextByXpathFromPage(page, '//*[text()="Case Number"]/following-sibling::td[1]');
            let fillingdate = await this.getTextByXpathFromPage(page, '//*[text()="Case Date"]/following-sibling::td[1]');
            let casetype = await this.getTextByXpathFromPage(page, '//*[text()="Type"]/following-sibling::td[1]');
            let property_addresss = await this.getTextByXpathFromPage(page, '//*[text()="Property Address"]/following-sibling::td[1]');
            let ownername = await this.getTextByXpathFromPage(page, '//*[text()="Owner"]/following-sibling::td[1]');
            ownername = ownername.slice(0, ownername.indexOf('&')).trim();
            let mailing_address = await this.getTextByXpathFromPage(page, '//*[text()="Owner Address"]/following-sibling::td[1]');

            if (await this.saveRecord({
                ownername,
                property_addresss,
                mailing_address,
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
        const parseName: any = this.newParseName(record.ownername.trim());
        if (parseName.type && parseName.type == 'COMPANY') {
            return false;
        }
        const data = {
            'First Name': parseName.firstName,
            'Last Name': parseName.lastName,
            'Middle Name': parseName.middleName,
            'Name Suffix': parseName.suffix,
            'Full Name': parseName.fullName,
            'Mailing Address': record.mailing_address,
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': record.property_addresss,
            "propertyAppraiserProcessed": false,
            "landgridPropertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            "caseUniqueId": record.caseno,
            fillingDate: record.fillingdate,
            originalDocType: record.casetype
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}