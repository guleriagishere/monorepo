import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';
import { add } from 'lodash';

export default class CivilProducer extends AbstractProducer {
    productId = '';
    sources =
      [
        { url: 'http://www.rfdreports.net/', handler: this.handleSource1 }
      ];

    async init(): Promise<boolean> {
        console.log("running init")
        this.browser = await this.launchBrowser();
        this.browserPages.generalInfoPage?.setDefaultTimeout(60000);
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

    async getStartNumber(){
        const lastItemDB: any = await db.models.OwnerProductProperty.findOne({ productId: this.productId, codeViolationId: { $ne: null }}).sort({createdAt: -1}).exec();
        if(lastItemDB){
            let startNumberStr = lastItemDB.codeViolationId.split("-").pop();
            return parseInt(startNumberStr);
        }
        return 0;
    }

    async getDateRange(): Promise<any> {
        const lastItemDB: any = await db.models.OwnerProductProperty.findOne({ productId: this.productId, codeViolationId: { $ne: null }}).sort({createdAt: -1}).exec();
        let date: any;
        if (lastItemDB && lastItemDB.fillingDate) {
            date = new Date(lastItemDB.fillingDate);
        } else {
            date = new Date();
            date.setDate(date.getDate() - 30);
        }
        let today = new Date();
        return { from: date, to: today };
    }

    async setSearchCriteria(page: puppeteer.Page, date: Date) {
        // setting date range
        const year = date.getFullYear().toString();
        const month = ("00" + (date.getMonth() + 1)).slice(-2);
        const day = ("00" + date.getDate()).slice(-2)
        await page.select('#date2_month', month);
        await page.select('#date2_day', day);
        await page.select('#date2_year', year);
    }

    async parseAndSave(): Promise<boolean> {
        let countRecords = 0;
        let page = this.browserPages.generalInfoPage;
        if (!page) return false;

        for (const source of this.sources) {
            countRecords += await source.handler.call(this, page, source.url);
        }
        
        console.log('---- ', countRecords);
        await AbstractProducer.sendMessage(this.publicRecordProducer.state, this.publicRecordProducer.county ? this.publicRecordProducer.county : this.publicRecordProducer.city, countRecords, 'Code Violation');
        return true;
    }

    async handleSource1(page: puppeteer.Page, link: string) {
        console.log('============ Checking for ', link);
        let counts = 0;
        const isPageLoaded = await this.openPage(page, link, '//form[@action="date.php"]//input[@value="Submit"]');
        if (!isPageLoaded) {
            console.log()
            return counts;
        }

        let dateRange = await this.getDateRange();
        let date = dateRange.from;
        let today = dateRange.to;
        let days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24));
        for (let i = days < 0 ? 1 : days; i >= 0; i--) {
            let dateSearch = new Date();
            dateSearch.setDate(dateSearch.getDate() - i);

            await this.setSearchCriteria(page, dateSearch);
            
            await page.click('form[action="date.php"] input[value="Submit"]');
            let frame: puppeteer.Frame | null | undefined;
            await page.waitForXPath('//iframe[@name="rightcolumn"]');
            let elementHandle = await page.$('iframe[name="rightcolumn"]');
            frame = await elementHandle?.contentFrame();
            await this.sleep(5000);
            const rows = await frame?.$x('//table[2]/tbody/tr/td/parent::tr');
            if (rows?.length == 0) {
                continue;
            };
            // get results
            counts += await this.getData1(frame!);
            await this.sleep(3000);
        }        
        return counts;
    }

    async getData1(frame: puppeteer.Frame) {
        let counts = 0;
        const rows = await frame.$x('//table[2]/tbody/tr/td/parent::tr');
        for (const row of rows) {
            let fillingDate = await row.evaluate(el => el.children[0].textContent?.trim());
            let caseType = await row.evaluate(el => el.children[1].textContent?.trim());
            let address = await row.evaluate(el => el.children[6].textContent?.trim());
            if (await this.saveRecord(address!, caseType!, fillingDate!)) {
                counts++;
            }
        }
        return counts;
    }

    async saveRecord(address: string, caseType: string, fillingDate: string) {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': address,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            fillingDate,
            originalDocType: caseType,
            codeViolationId: ''
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }

    getDateString(date: Date): string {
        return ("00" + (date.getMonth() + 1)).slice(-2) + "/" + ("00" + date.getDate()).slice(-2) + "/" + date.getFullYear();
    }
}