import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';

export default class CivilProducer extends AbstractProducer {
    productId = '';
    sources =
      [
        { url: 'https://aca-prod.accela.com/PINELLAS/Cap/CapHome.aspx?module=Enforcement&TabName=Enforcement', handler: this.handleSource1 }
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

    async setSearchCriteria(page: puppeteer.Page, prefix: number) {
        let year = (new Date()).getFullYear().toString().substr(-2);
        let searchKey = `CLS-${year}-${prefix.toString()}`;
        const searchInput = await page.$('input#ctl00_PlaceHolderMain_generalSearchForm_txtGSPermitNumber');
        await searchInput?.click({clickCount: 3});
        await searchInput?.press('Backspace');
        await searchInput?.type(searchKey, {delay: 100});
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

        let startNum = await this.getStartNumber();
        for (let pre = startNum ; pre < 9 ; pre++) {
            const isPageLoaded = await this.openPage(page, link, '//span[text()="Search"]/parent::a');
            if (!isPageLoaded) {
                console.log()
                break;
            }
            await this.setSearchCriteria(page, pre);               
            
            await page.click('div#ctl00_PlaceHolderMain_btnNewSearch_container a[title="Search"]');
            await page.waitForXPath('//div[@id="divGlobalLoading"]', {visible: true});
            await page.waitForXPath('//div[@id="divGlobalLoading"]', {hidden: true});

            let result_handle = await Promise.race([
                page.waitForXPath('//span[contains(text(), "no results")]', {visible: true}),
                page.waitForXPath('//div[@class="ACA_Grid_OverFlow"]//tr[not(contains(@class, "ACA_TabRow_Header")) and contains(@class, "TabRow")]', {visible: true})
            ]);
            
            let result_text = await result_handle.evaluate(el => el.textContent || '');
            if (result_text?.indexOf('no results') > -1) {
                console.log('No Results Found');
                break;
            }
            // get results
            counts += await this.getData1(page, pre);
            await this.sleep(3000);
        }
        return counts;
    }

    async getData1(page: puppeteer.Page, pre: number) {
        let counts = 0, pageNum = 1;

        while (true) {            
            const rowXpath = '//div[@class="ACA_Grid_OverFlow"]//tr[not(contains(@class, "ACA_TabRow_Header")) and contains(@class, "TabRow")]';
            const rows = await page.$x(rowXpath);
            for (const row of rows) {
                let address = await row.evaluate(el => el.children[6].children[0].children[0].textContent?.trim());
                let fillingDate = await row.evaluate(el => el.children[1].children[0].children[0].textContent?.trim());
                let originalDocType = await row.evaluate(el => el.children[2].children[0].children[0].textContent?.trim());
               
                if (await this.saveRecord(address!, originalDocType!, fillingDate!, pre)) {
                    counts++;
                }
            }
            let nextHandle = await page.$x(`//a[contains(text(), "Next")]`);
            if (nextHandle.length > 0) {
                await nextHandle[0].click();
                await page.waitForXPath('//div[@id="divGlobalLoading"]', {visible: true});
                await page.waitForXPath('//div[@id="divGlobalLoading"]', {hidden: true});
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