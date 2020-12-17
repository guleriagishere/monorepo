import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';

export default class CivilProducer extends AbstractProducer {
    sources =
      [
        { url: 'https://trakit.miamilakes-fl.gov/etrakit/Search/case.aspx', handler: this.handleSource1 }
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
        let id = 1;
        while (true) {
            // load page
            const isPageLoaded = await this.openPage(page, link, '//*[@id="cplMain_txtSearchString"]');
            if (!isPageLoaded) {
                console.log('Page loading is failed, trying next...');
                continue;
            }
            await this.setSearchCriteria1(page, id);
            // click search button
            await page.click('#ctl00_cplMain_btnSearch');
            // wait for search result
            let result_handle = await Promise.race([
                page.waitForXPath('//*[@id="cplMain_lblNoSearchRslts"]', {visible: true}),
                page.waitForXPath('//*[@id="ctl00_cplMain_hlSearchResults"]', {visible: true})
            ]);
            let result_text = await result_handle.evaluate(el => el.textContent || '');
            if (result_text?.indexOf('no results') > -1) {
                console.log('No Results Found');
                continue;
            }
            // get results
            if (await this.getData1(page))
                counts ++
            else
                break;
            await this.sleep(3000);
        }
        return counts;
    }

    async setSearchCriteria1(page: puppeteer.Page, id: number) {
        // get year
        let year = (new Date()).getFullYear();
        // choose begin with
        await page.select('#cplMain_ddSearchOper', 'BEGINS WITH');
        // page loaded successfully
        let [input_handle] = await page.$x('//*[@id="cplMain_txtSearchString"]');
        await input_handle.type(`C${year}-${id.toString().padStart(4, '0')}`, {delay: 100});
    }

    async getData1(page: puppeteer.Page) {
        const [row] = await page.$x('//table[contains(@id, "rgSearchRslts")]/tbody/tr[1]');
        if (!row) return false;
        let caseno = await page.evaluate(el => el.children[0].textContent, row);
        caseno = caseno.replace(/\s+|\n/, ' ').trim();
        let casetype = await page.evaluate(el => el.children[1].textContent, row);
        casetype = casetype.replace(/\s+|\n/, ' ').trim();
        let address = await page.evaluate(el => el.children[2].textContent, row);
        address = address.replace(/\s+|\n/, ' ').trim();
        return await this.saveRecord(address, caseno, casetype);
    }

    async saveRecord(address: string, caseNumber: string, caseType: string) {     
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': address,
            "propertyAppraiserProcessed": false,
            "landgridPropertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            originalDocType: caseType
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}