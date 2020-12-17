import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';
const parser = require('parse-address');

export default class CivilProducer extends AbstractProducer {
    productId = '';

    sources =
        [
            { url: 'http://cagismaps.hamilton-co.org/PropertyActivity/PropertyMaintenance', handler: this.handleSource1 }
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
            await page.goto(link, { waitUntil: 'load', timeout: 200000 });
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
        const isPageLoaded = await this.openPage(page, link, '//select[@id="ctl00_PlaceHolderMain_generalSearchForm_ddlGSPermitType"]');
        if (!isPageLoaded) {
            console.log("Website not loaded successfully:", link);
            return counts;
        }

        // get results
        counts += await this.getData1(page);
        await this.sleep(3000);
        return counts;
    }

    getFormattedDate(date: Date) {
        let year = date.getFullYear();
        let month = (1 + date.getMonth()).toString().padStart(2, '0');
        let day = date.getDate().toString().padStart(2, '0');

        return month + '/' + day + '/' + year;
    }

    async getData1(page: puppeteer.Page) {
        let counts = 0;

        await page.goto('http://cagismaps.hamilton-co.org/PropertyActivity/PropertyMaintenance');
        await page.waitForXPath('//div[@id="recordDetailsButton"]', { visible: true, timeout: 200000 });
        let btnDatabase = await page.$x('//div[@id="recordDetailsButton"]');
        await btnDatabase[0].click();
        await page.waitForXPath('//div[@id="spinnygrid"]/img[contains(@src,"loading.gif") and contains(@style,"display: block;")]', { visible: true, timeout: 200000 });
        await page.waitForXPath('//div[@id="spinnygrid"]/img[contains(@src,"loading.gif") and contains(@style,"display: none;")]', { timeout: 200000 });

        await page.waitForXPath('//div[@id="dropDownSelect"]', { visible: true, timeout: 200000 });
        let btnDropDown = await page.$x('//div[@id="dropDownSelect"]');
        await btnDropDown[0].click();
        await page.waitForXPath('//div[@class="dropdown open"]', { visible: true, timeout: 200000 });
        let btnToday = await page.$x('//li[@id="Today"]')
        await btnToday[2].click()
        await page.waitForXPath('//div[@id="spinnygrid"]/img[contains(@src,"loading.gif") and contains(@style,"display: block;")]', { visible: true, timeout: 200000 });
        await page.waitForXPath('//div[@id="spinnygrid"]/img[contains(@src,"loading.gif") and contains(@style,"display: none;")]', { timeout: 200000 });
        let loopingStop = false;
        try {
            await page.waitForXPath('//div[contains(@class,"dgrid-row-even") or contains(@class,"dgrid-row-odd")]', { visible: true, timeout: 200000 });
        } catch (err) {
            return counts;
        }
        let rowData = await page.$x('//div[contains(@class,"dgrid-row-even") or contains(@class,"dgrid-row-odd")]')
        while (!loopingStop) {
            await page.waitForXPath('//div[@id="spinnygrid"]/img[contains(@src,"loading.gif") and contains(@style,"display: none;")]', { timeout: 200000 });
            for (let i = 0; i < rowData.length; i++) {
                let index = i + 1;
                let caseNumberXpath = await page.$x('//div[contains(@class,"dgrid-row-even") or contains(@class,"dgrid-row-odd")][' + index + ']/table/tr/td[2]');
                let addressXpath = await page.$x('//div[contains(@class,"dgrid-row-even") or contains(@class,"dgrid-row-odd")][' + index + ']/table/tr/td[3]');
                let caseTypeXpath = await page.$x('//div[contains(@class,"dgrid-row-even") or contains(@class,"dgrid-row-odd")][' + index + ']/table/tr/td[5]');
                let fillingDateXpath = await page.$x('//div[contains(@class,"dgrid-row-even") or contains(@class,"dgrid-row-odd")][' + index + ']/table/tr/td[9]');

                try {
                    let caseNumber = await caseNumberXpath[0].evaluate(el => el.textContent?.trim());
                    let address = await addressXpath[0].evaluate(el => el.textContent?.trim());
                    let caseType = await caseTypeXpath[0].evaluate(el => el.textContent?.trim());
                    let fillingDate = await fillingDateXpath[0].evaluate(el => el.textContent?.trim());

                    if (await this.saveRecord(address!, caseType!, fillingDate, caseNumber!))
                        counts++;
                } catch (err) {

                    continue
                }
            }
            try {
                await page.waitForXPath('//span[contains(@class,"dgrid-next dgrid-page-link dgrid-page-disabled") and contains(@aria-label,"Go to next page")]', { visible: true, timeout: 200000 });
                loopingStop = true
            } catch (err) {
                let btnClickNext = await page.$x('//span[contains(@class,"dgrid-next dgrid-page-link") and contains(@aria-label,"Go to next page")]');
                await btnClickNext[0].click()
                await page.waitForXPath('//div[@id="spinnygrid"]/img[contains(@src,"loading.gif") and contains(@style,"display: block;")]', { visible: true, timeout: 200000 });
            }
        }
        return counts;
    }

    async saveRecord(address: string, caseType: string, fillingDate = '', codeViolationId: string) {
        const parsed = parser.parseLocation(address);
        const number = parsed.number ? parsed.number : '';
        const street = parsed.street ? parsed.street : '';
        const type = parsed.type ? parsed.type : '';
        const propertyAddress = number + ' ' + street + ' ' + type;
        const propertyZip = parsed.zip ? parsed.zip : '';
        const propertyCity = parsed.city ? parsed.city : '';
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': propertyAddress,
            'Property City': propertyCity,
            'Property Zip': propertyZip,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            fillingDate,
            codeViolationId,
            originalDocType: caseType
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}