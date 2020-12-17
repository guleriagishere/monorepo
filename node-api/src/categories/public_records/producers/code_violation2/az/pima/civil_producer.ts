import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';

export default class CivilProducer extends AbstractProducer {
    productId = '';

    sources =
      [
        {url: 'https://neighsupport.net/codevio/cezlatest.html', handler: this.handleSource1 }
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
        // load page
        const isPageLoaded = await this.openPage(page, link, '//*[text()="Latest Cases Opened by Tucson Code Enforcement"]');
        if (!isPageLoaded) {
            console.log("Website not loaded successfully:", link);
            return counts;
        }

        // get results
        counts += await this.getData1(page);
        await this.sleep(3000);
        return counts;
    }

    async getData1(page: puppeteer.Page) {
        let counts = 0;
        const rows = await page.$x('//table/tbody/tr');
        rows.shift();
        for (const row of rows) {
            try{
                let casetype = await page.evaluate(el => el.children[2].textContent, row);
                casetype = casetype.replace(/\s+|\n/, ' ').trim();
                let address = await page.evaluate(el => el.children[1].textContent, row);
                address = address.replace(/\s+|\n/, ' ').trim();
                let fillingdate = await page.evaluate(el => el.children[0].textContent, row);
                fillingdate = fillingdate.replace(/\s+|\n/, ' ').trim();
                if (await this.saveRecord(address, casetype, fillingdate))
                    counts++;
            } catch(e){
                continue;
            }
        }
        return counts;
    }

    async saveRecord(address: string, caseType: string, fillingDate = '') {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': address,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            fillingDate,
            originalDocType: caseType
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}