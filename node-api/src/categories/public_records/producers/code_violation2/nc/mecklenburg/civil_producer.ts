import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';

export default class CivilProducer extends AbstractProducer {
    productId = '';
    sources =
      [
        { url: 'https://aca-prod.accela.com/CHARLOTTE/Welcome.aspx', handler: this.handleSource1 }
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
        let year = (new Date()).getFullYear().toString();
        let searchKey = `NOVEC-${year}-${prefix.toString()}`;
        const searchHandle = await page.$('input[id*="txtGSPermitNumber"]');
        await searchHandle?.click();
        await searchHandle?.type(searchKey, {delay: 300});
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
        const isPageLoaded = await this.openPage(page, link, '//ipage[@id="ACApage"]');
        if (!isPageLoaded) {
            console.log()
            return 0;
        }

        const enforcementHandle = await page.$x('//span[@id="span_tab_2"]//a');
        await enforcementHandle[0].click();
        await this.sleep(3000)
        await page.waitForSelector('input[id*="txtGSPermitNumber"]', {visible: true});
        let startNum = await this.getStartNumber();
        await this.sleep(3000);
        for (let pre = startNum ; pre < 9 ; pre++) {
            
            await this.setSearchCriteria(page, pre);               
            
            await page.click('div > #ctl00_PlaceHolderMain_btnNewSearch');
            await page.waitForXPath('//div[@id="divGlobalLoading"]', {visible: true});
            await page.waitForXPath('//div[@id="divGlobalLoading"]', {hidden: true});

            let result_handle = await Promise.race([
                page.waitForXPath('//span[contains(text(), "no results")]', {visible: true}),
                page.waitForXPath('//table[@id="ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList"]//tr[not(contains(@class, "ACA_TabRow_Header")) and contains(@class, "TabRow")]', {visible: true})
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
        const url = 'https://aca-prod.accela.com/'
        const dateSortHandle = await page.$x('//span[text()="OpenDate"]/parent::a');
        await dateSortHandle[0].click();
        await this.sleep(2000);

        while (true) {            
            const rowXpath = '//table[@id="ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList"]//tr[not(contains(@class, "ACA_TabRow_Header")) and contains(@class, "TabRow")]';
            const rows = await page.$x(rowXpath);
            for (let i = 0; i < rows.length; i++) {
                let fillingDate = await rows[i].evaluate(el => el.children[1].children[0].children[0].textContent?.trim());
                let originalDocType = await rows[i].evaluate(el => el.children[3].children[0].children[0].textContent?.trim());
                let link = await rows[i].evaluate(el => el.children[2].children[0].children[1].getAttribute('href'));

                const detailPage = await this.browser?.newPage();
                if (!detailPage) {
                    break;
                }
                await detailPage.goto(url + link, {waitUntil: 'load'});
                const addressHandle = await detailPage.$x('//table[@id="tbl_worklocation"]//tr//span');
                if (addressHandle.length == 0) {
                    await detailPage.close();
                    continue;
                }
                let address = await addressHandle[0].evaluate(el => el.textContent?.trim());
                await detailPage.close();
                if (await this.saveRecord(address!, originalDocType!, fillingDate!, pre)) {
                    counts++;
                }
            }
            let nextHandle: puppeteer.ElementHandle<Element>[];
            nextHandle = await page.$x('//a[contains(text(), "Next")]');
            if (nextHandle.length > 0) {
                await Promise.all([
                    nextHandle[0].click(),
                    page.waitForXPath(`//span[@class="SelectedPageButton font11px" and text()="${pageNum + 1}"]`)
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