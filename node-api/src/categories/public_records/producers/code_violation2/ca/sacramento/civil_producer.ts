import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';

export default class CivilProducer extends AbstractProducer {
    productId = '';

    sources =
      [
        { url: 'https://www.citizenserve.com/Sacramento/CitizenController?Action=DisplaySearchPage&CtzPagePrefix=Sa&InstallationID=43', handler: this.handleSource1 }
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
        const isPageLoaded = await this.openPage(page, link, '//input[@name="CaseNumber"]');
        if (!isPageLoaded) {
            console.log("Website not loaded successfully:", link);
            return counts;
        }

        let year: any = (new Date()).getFullYear();
        year = year.toString().slice(-2);
        // get results
        counts += await this.getData1(page, year);
        await this.sleep(3000);
        return counts;
    }

    async getTextByXpathFromPage(page: puppeteer.Page, xPath: string): Promise<string> {
        const [elm] = await page.$x(xPath);
        if (elm == null) {
            return '';
        }
        let text = await page.evaluate(j => j.innerText, elm);
        return text.replace(/\n/g, ' ');
    }

    async inputFromXpath(page: puppeteer.Page, xPath: string, input: string): Promise<boolean>{
        try{
            let [selectInput] = await page.$x(xPath);
            await selectInput.type(input, {delay: 150});
            return true;
        } catch(e){
            console.log(e);
            return false;
        }
    }

    getStartNumberString(startNum: number, lengthdigit = 6){
        let result = startNum.toString();
        while(result.length < lengthdigit){
            result = '0' + result;
        }
        return result;
    }

    async getStartNumber(){
        const lastItemDB: any = await db.models.OwnerProductProperty.findOne({ productId: this.productId, codeViolationId: { $ne: null }}).sort({createdAt: -1}).exec();
        if(lastItemDB){
            let startNumberStr = lastItemDB.codeViolationId.split("-").pop();
            return parseInt(startNumberStr);
        }
        return 1;
    }

    async getData1(page: puppeteer.Page, year: any) {
        let counts = 0;
        let startNum = await this.getStartNumber();

        const caseInputXpath = '//input[@name="CaseNumber"]';
        const btnSubmitXpath = '//input[@name="BtnSubmit"]';
        const searchResultXpath = '//font[contains(., "Case #")]/ancestor::tbody[1]/tr';
        const fillingDateXpath = '//font[contains(., "Case #")]/ancestor::tbody[1]/tr[2]/td[6]';
        const caseTypeXpath = '//font[contains(., "Case #")]/ancestor::tbody[1]/tr[2]/td[4]';
        const streetNumberXpath = '//font[contains(., "Case #")]/ancestor::tbody[1]/tr[2]/td[2]';
        const streetNameXpath = '//font[contains(., "Case #")]/ancestor::tbody[1]/tr[2]/td[3]';

        for(let i = 0; i < 100; i++){
            let startNumString = this.getStartNumberString(startNum);
            let caseId = year + "-" + startNumString;
            console.log(caseId);
            try{
                await page.goto('https://www.citizenserve.com/Sacramento/CitizenController?Action=DisplaySearchPage&CtzPagePrefix=Sa&InstallationID=43', {waitUntil: 'networkidle0'});
                await this.inputFromXpath(page, caseInputXpath, caseId);
                let [btnSubmit] = await page.$x(btnSubmitXpath);
                await Promise.all([
                    btnSubmit.click(),
                    page.waitForNavigation()
                ]);
                let searchResult = await page.$x(searchResultXpath);
                if(searchResult.length < 2){
                    console.log('Not found!');
                    startNum++;
                    continue;
                }
                let casetype = await this.getTextByXpathFromPage(page, caseTypeXpath);
                casetype = casetype.replace(/\s+|\n/, ' ').trim();
                let streetnumber = await this.getTextByXpathFromPage(page, streetNumberXpath);
                let streetname = await this.getTextByXpathFromPage(page, streetNameXpath);
                let address = streetnumber + " " + streetname;
                address = address.replace(/\s+|\n/, ' ').trim();
                if(address == 'MISCELLANEOUS'){
                    startNum++;
                    continue;
                }
                let fillingdate = await this.getTextByXpathFromPage(page, fillingDateXpath);
                fillingdate = fillingdate.replace(/\s+|\n/, ' ').trim();
                if (await this.saveRecord(address, casetype, fillingdate, caseId)){
                    counts++;
                }
                startNum++;
            } catch(e){
                startNum++;
                continue;
            }
        }
        return counts;
    }

    async saveRecord(address: string, caseType: string, fillingDate = '', codeViolationId = '') {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': address,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            fillingDate,
            originalDocType: caseType,
            codeViolationId
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}