import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';

export default class CivilProducer extends AbstractProducer {
    productId = '';

    sources =
      [
        { url: 'https://cobbca.cobbcounty.org/CitizenAccess/Cap/CapDetail.aspx?Module=Enforce&TabName=Enforce&capID1=20CED&capID2=00000&capID3=00001&agencyCode=COBBCO&IsToShowInspection=', handler: this.handleSource1 }
      ];

    async init(): Promise<boolean> {
        console.log("running init")
        this.browser = await this.launchBrowser();
        this.browserPages.generalInfoPage = await this.browser.newPage();
        this.browserPages.generalInfoPage.setDefaultTimeout(200000);
        await this.setParamsForPage(this.browserPages.generalInfoPage);
        return true;
    };
    async read(): Promise<boolean> {
      return true;
    };

    async openPage(page: puppeteer.Page, link: string, xpath: string) {
        try {
            await page.goto(link, {waitUntil: 'networkidle0'});
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
        const isPageLoaded = await this.openPage(page, link, '//*[text()="Search Code Enforcement Cases"]');
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

        const caseIdXpath = '//span[@id="ctl00_PlaceHolderMain_lblPermitNumber"]';
        const caseTypeXpath = '//span[@id="ctl00_PlaceHolderMain_lblPermitType"]';
        const addressXpath = '//div[@id="divWorkLocationInfo"]//span[@class="fontbold"]';
        const ownerNameXpath = '//div[@class="div_parent_detail"]//td[@style="vertical-align:top"]';

        for(let i = 0; i < 100; i++){
            let startNumString = this.getStartNumberString(startNum);
            // let caseId = "COD" + year + "-" + startNumString;
            let caseUrl = "https://cobbca.cobbcounty.org/CitizenAccess/Cap/CapDetail.aspx?Module=Enforce&TabName=Enforce&capID1="+year+"CED&capID2=00000&capID3="+startNumString+"&agencyCode=COBBCO&IsToShowInspection=";
            console.log(caseUrl);
            try{
                await page.goto(caseUrl, {waitUntil: 'networkidle0'});
                let notFound = await page.$x('//span[@id="ctl00_PlaceHolderMain_systemErrorMessage_lblMessageTitle"]');
                if(notFound.length > 0){
                    console.log('Not found!');
                    startNum++;
                    continue;
                }
                let caseid = await this.getTextByXpathFromPage(page, caseIdXpath);
                caseid = caseid.replace(/\s+|\n/, ' ').trim();
                let casetype = await this.getTextByXpathFromPage(page, caseTypeXpath);
                casetype = casetype.replace(/\s+|\n/, ' ').trim();
                let address = await this.getTextByXpathFromPage(page, addressXpath);
                address = address.replace(/\s+|\n/, ' ').trim();
                let ownername = await this.getTextByXpathFromPage(page, ownerNameXpath);
                address = address.replace(/\s+|\n/, ' ').trim();
                counts += (await this.saveRecord(address, casetype, caseid, ownername));
                startNum++;
            } catch(e){
                startNum++;
                continue;
            }
        }
        return counts;
    }

    async saveRecord(address: string, caseType: string, caseId: string, ownerName: string) {
        let count = 0;

        // save property data
        const propertyObj = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': address,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            originalDocType: caseType,
            codeViolationId: caseId
        };
        if(await this.civilAndLienSaveToNewSchema(propertyObj)){
            count++;
        }

        // save owner data
        let parseName: any = this.newParseName(ownerName);
        if(parseName.type && parseName.type == 'COMPANY'){
            return count;
        }
        const ownerObj = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'First Name': parseName.firstName,
            'Last Name': parseName.lastName,
            'Middle Name': parseName.middleName,
            'Name Suffix': parseName.suffix,
            'Full Name': parseName.fullName,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            originalDocType: caseType,
            codeViolationId: caseId
        }
        if(await this.civilAndLienSaveToNewSchema(ownerObj)){
            count++;
        }

        return count;
    }
}