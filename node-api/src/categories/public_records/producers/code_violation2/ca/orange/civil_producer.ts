import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';

export default class CivilProducer extends AbstractProducer {
    productId = '';

    sources =
      [
        { url: 'http://permits.anaheim.net/tm_bin/tmw_cmd.pl?tmw_cmd=StatusViewCasecod&shl_caseno=COD2020-10000', handler: this.handleSource1 }
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
        const isPageLoaded = await this.openPage(page, link, '//*[text()="View Request for Service Status"]');
        if (!isPageLoaded) {
            console.log("Website not loaded successfully:", link);
            return counts;
        }

        let year = (new Date()).getFullYear();
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

    getStartNumberString(startNum: number, lengthdigit = 5){
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

    async getData1(page: puppeteer.Page, year: number) {
        let counts = 0;
        let startNum = await this.getStartNumber();

        const fillingDateXpath = '//b[@text()="Received Date:"]/ancestor::tr/td[2]';
        const caseTypeXpath = '//b[contains(text(), "Complaint Type")]/ancestor::tbody/tr[2]/td[1]';
        const addressXpath = '//b[contains(text(), "Address:")]/ancestor::tr/td[2]';

        for(let i = 0; i < 100; i++){
            let startNumString = this.getStartNumberString(startNum);
            let caseId = "COD" + year + "-" + startNumString;
            let caseUrl = "http://permits.anaheim.net/tm_bin/tmw_cmd.pl?tmw_cmd=StatusViewCasecod&shl_caseno=" + caseId;
            console.log(caseUrl);
            try{
                await page.goto(caseUrl, {waitUntil: 'networkidle0'});
                let notFound = await page.$x('//*[contains(text(), "Not Allowed")]');
                if(notFound.length > 0){
                    console.log('Not found!');
                    startNum++;
                    continue;
                }
                let casetype = await this.getTextByXpathFromPage(page, caseTypeXpath);
                casetype = casetype.replace(/\s+|\n/, ' ').trim();
                let address = await this.getTextByXpathFromPage(page, addressXpath);
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