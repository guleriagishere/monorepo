import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';

export default class CivilProducer extends AbstractProducer {
    productId = '';
    isStart = false;
    sources =
      [
        { url: 'http://apps.hollywoodfl.org/ViolationSearch/CEviolations_query.aspx', handler: this.handleSource1 }
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
        let year = (new Date()).getFullYear().toString().substr(-2);
        if (parseInt(year) == 20) {
            return 10;
        }
        return 0;
    }

    async setSearchCriteria(page: puppeteer.Page, prefix: number) {
        let year = (new Date()).getFullYear().toString().substr(-2);
        await page.click('#radStatusAll');
        let searchKey = `V${year}-${prefix.toString().padStart(2, '0')}`;
        await page.type('#txtCaseNum', searchKey, {delay: 150});
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

        let startNum = await this.getStartNumber();
        for (let pre = startNum ; pre < 100 ; pre++) {
            const isPageLoaded = await this.openPage(page, link, '//*[@id="cmdSearch"]');
            if (!isPageLoaded) {
                console.log()
                break;
            }
            await this.setSearchCriteria(page, pre);               
            
            await Promise.all([
                page.click('#cmdSearch'),
                page.waitForNavigation()
            ]);
            
            const result_count_handle = await page.$('#lblRowCount');
            let result_count = await result_count_handle?.evaluate(el => el.textContent?.trim());
            result_count = result_count?.replace(/^\D+/g, '');
            if (parseInt(result_count!) == 0) {
                break;
            } else {
                counts += await this.getData1(page, pre);
                await this.sleep(3000);
            }

            await Promise.all([
                page.click('#lblSearchBackLink > a'),
                page.waitForNavigation()
            ]);
        }
        return counts;
    }

    async getData1(page: puppeteer.Page, pre: number) {
        let counts = 0, pageNum = 1;
        const dateSortHandle = await page.$x('//*[@id="Section1"]/form/table/tbody/tr[@valign="middle"]/td[last()]/a');
        await Promise.all([
            dateSortHandle[0].click(),
            page.waitForNavigation()
        ])
        await this.sleep(2000);

        while (true) {            
            const rowXpath = '//*[@id="Section1"]/form/*[@id="dgCEviolationsList"]/tbody/tr[not(@align="center")]';
            const rows = await page.$x(rowXpath);
            for (const row of rows) {
                let address = await row.evaluate(el => el.children[2].textContent?.trim());
                let fillingDate = await row.evaluate(el => el.children[5].textContent?.trim());
                let originalDocType = await row.evaluate(el => el.children[4].textContent?.trim());
               
                if (await this.saveRecord(address!, originalDocType!, fillingDate!, pre)) {
                    counts++;
                }
            }
            let nextHandle: puppeteer.ElementHandle<Element>[];
            nextHandle = await page.$x(`//a[text()="${pageNum + 1}"]`);
            if (!nextHandle[0]) {
                nextHandle = await page.$x(pageNum > 11 ? '//a[contains(@href, "dgCEviolationsList$ctl1004$ctl11")]' : '//a[contains(@href, "dgCEviolationsList$ctl1004$ctl10")]');
            }
            if (nextHandle.length > 0) {
                await Promise.all([
                    nextHandle[0].click(),
                    page.waitForNavigation()
                ])
                pageNum++;
            } else {
                break;
            }            
        }
        return counts;
    }

    async saveRecord(address: string, caseType: string, fillingDate: string, pre: number) {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': address,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            fillingDate,
            originalDocType: caseType,
            codeViolationId: pre.toString()
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}