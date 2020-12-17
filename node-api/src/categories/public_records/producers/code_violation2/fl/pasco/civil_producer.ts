import puppeteer from 'puppeteer';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import db from '../../../../../../models/db';
const parser = require('parse-address');

export default class CivilProducer extends AbstractProducer {
    productId = '';

    sources =
        [
            { url: 'https://aca-pasco.accela.com/pasco/Login.aspx', handler: this.handleSource1 }
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
            await page.goto(link, { waitUntil: 'load' });
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

    async getDateRange(state: string, county: string) {
        console.log('\n// =============== FETCHING DATE RANGE ===============')

        const lastItemDB: any = await db.models.OwnerProductProperty.findOne({ productId: this.productId, codeViolationId: { $ne: null } }).sort({ createdAt: -1 }).exec();
        const lastfillingDate = lastItemDB ? lastItemDB.fillingDate : null;
        console.log(lastItemDB)
        console.log(lastfillingDate)
        // const lastItemDB = await db.models.OwnerProductProperty.findOne({
        //     fillingDate: { "$exists": true, "$ne": null },
        //     productId: { $in: productIdsArray }
        // }, null, { sort: { fillingDate: -1 } }); // check last item from DB

        let fromDate;
        if (lastfillingDate) {

            fromDate = new Date(lastfillingDate);
            if (isNaN(fromDate.getTime())) {
                fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - 30);
            } else {
                fromDate.setDate(fromDate.getDate() - 1);
            }
        } else {
            fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 30);
        }
        let toDate = new Date();

        console.log('start date : ' + this.getFormattedDate(fromDate));
        console.log('end date : ' + this.getFormattedDate(toDate));
        console.log('\n');

        return { from: fromDate, to: toDate };
    }

    getFormattedDate(date: Date) {
        let year = date.getFullYear();
        let month = (1 + date.getMonth()).toString().padStart(2, '0');
        let day = date.getDate().toString().padStart(2, '0');

        return month + '/' + day + '/' + year;
    }

    async getData1(page: puppeteer.Page) {
        let email = 'homesalesllc@gmail.com';
        let password = 'test12345'
        await page.goto('https://aca-pasco.accela.com/pasco/Login.aspx');
        await page.waitForXPath('//input[@id="ctl00_PlaceHolderMain_LoginBox_txtUserId"]', { visible: true, timeout: 200000 });
        await page.evaluate(() => {
            // @ts-ignore
            document.querySelector('#ctl00_PlaceHolderMain_LoginBox_txtUserId').value = '';
            // @ts-ignore
            document.querySelector('#ctl00_PlaceHolderMain_LoginBox_txtPassword').value = '';
        })
        await page.type('#ctl00_PlaceHolderMain_LoginBox_txtUserId', email, { delay: 150 });
        await page.type('#ctl00_PlaceHolderMain_LoginBox_txtPassword', password, { delay: 150 });

        let btnLogin = await page.$x('//a[@id="ctl00_PlaceHolderMain_LoginBox_btnLogin"]')
        await btnLogin[0].click();
        await page.waitForXPath('//span[@id="ctl00_PlaceHolderMain_lblHellow"]', { visible: true, timeout: 200000 });

        let counts = 0;
        let dateRange = await this.getDateRange('Florida', 'Lee');
        let fromDate = dateRange.from;
        let toDate = dateRange.to;
        try {
            let valueForSelect = ['Enforcement/Case/Appeal/NA', 'Enforcement/Case/Material/NA', 'Enforcement/Case/Complaint/NA', 'Enforcement/Case/Citation/NA', 'Enforcement/Case/Condemnation/NA', 'Enforcement/Case/Violation/NA'];
            let docTypeArr = ['Appeal', 'Board and Secure', 'Building Complaint', 'Citation/Min Housing', 'File Condemnation', 'Violation'];

            for (let j = 0; j < valueForSelect.length; j++) {
                await page.goto('https://aca-pasco.accela.com/pasco/Cap/CapHome.aspx?module=Enforcement&TabName=Enforcement&TabList=Home%7C0%7CPermits%7C1%7CLicenses%7C2%7CEnforcement%7C3%7CCurrentTabIndex%7C3');
                await page.waitForXPath('//select[@id="ctl00_PlaceHolderMain_generalSearchForm_ddlGSPermitType"]', { visible: true, timeout: 200000 });
                await page.select('#ctl00_PlaceHolderMain_generalSearchForm_ddlGSPermitType', valueForSelect[j]);

                await page.waitForXPath('//div[@id="divGlobalLoading" and contains(@style,"display: block;")]', { visible: true, timeout: 5000 });
                await this.sleep(5000);
                console.log(this.getFormattedDate(fromDate))
                await page.click('input#ctl00_PlaceHolderMain_generalSearchForm_txtGSStartDate', { clickCount: 3 });
                await page.type('input#ctl00_PlaceHolderMain_generalSearchForm_txtGSStartDate', this.getFormattedDate(fromDate));
                await page.click('input#ctl00_PlaceHolderMain_generalSearchForm_txtGSEndDate', { clickCount: 3 });
                await page.type('input#ctl00_PlaceHolderMain_generalSearchForm_txtGSEndDate', this.getFormattedDate(toDate));


                let buttonSearch = await page.$x('//a[@id="ctl00_PlaceHolderMain_btnNewSearch"]');
                await buttonSearch[0]!.click();

                try {
                    await page.waitForXPath('//span[contains(.,"Showing")]', { visible: true, timeout: 8000 });
                } catch (err) {
                    console.log('No Result For ' + docTypeArr[j]);
                    continue
                }
                let flagStop = false;
                while (!flagStop) {
                    await page.waitForXPath('//div[@id="divGlobalLoading" and contains(@style,"display: none;")]', { timeout: 60000 });
                    let casetype = docTypeArr[j];
                    let totalRow = await page.$x('//table[@id="ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList"]/tbody/tr[contains(@class,"ACA_TabRow_Odd") or contains(@class,"ACA_TabRow_Even")]');
                    for (let l = 0; l < totalRow!.length; l++) {
                        let index = l + 1;
                        let [addressXpath] = await page.$x('//table[@id="ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList"]/tbody/tr[contains(@class,"ACA_TabRow_Odd") or contains(@class,"ACA_TabRow_Even")][' + index + ']/td[5]');
                        let address;
                        try {
                            address = await addressXpath.evaluate(el => el.textContent?.trim());
                        } catch (err) {
                            continue
                        }
                        let [codeViolationIdXpath] = await page.$x('//table[@id="ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList"]/tbody/tr[contains(@class,"ACA_TabRow_Odd") or contains(@class,"ACA_TabRow_Even")][' + index + ']/td[3]');
                        let codeViolationId;
                        try {
                            codeViolationId = await codeViolationIdXpath.evaluate(el => el.textContent?.trim());
                        } catch (err) {
                            continue
                        }
                        let [fillingdateXpath] = await page.$x('//table[@id="ctl00_PlaceHolderMain_dgvPermitList_gdvPermitList"]/tbody/tr[contains(@class,"ACA_TabRow_Odd") or contains(@class,"ACA_TabRow_Even")][' + index + ']/td[2]');
                        let fillingdate;
                        try {
                            fillingdate = await fillingdateXpath.evaluate(el => el.textContent?.trim());
                        } catch (err) {
                            continue
                        }
                        if (await this.saveRecord(address!, casetype, fillingdate, codeViolationId!))
                            counts++;
                    }
                    try {
                        let btnNext = await page.$x('//a[contains(.,"Next") and contains(@href,"javascript")]');
                        await btnNext[0].click();
                        await this.sleep(2000);
                    } catch (err) {
                        flagStop = true
                    }
                }

            }
        } catch (e) {

        }
        let btnLogout = await page.$x('//span[@id="ctl00_HeaderNavigation_com_headIsLoggedInStatus_label_logout"]')
        await btnLogout[0].click();

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