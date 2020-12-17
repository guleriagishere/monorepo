import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import axios from 'axios';
import {countReset} from 'console';

export default class CivilProducer extends AbstractProducer {

    sources =
        [
            {url: 'https://permits.adcogov.org/CitizenAccess/Cap/Caphome.aspx?module=Enforcement&TabName=Enforcement', handler: this.handleSource1 }
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
        for (let month = 1; month < 13; month++) {
            // load page
            const isPageLoaded = await this.openPage(page, link, '//*[contains(@id,"txtGSStartDate")]');
            if (!isPageLoaded) {
                console.log()
                continue;
            }
            // const [searchBtn] = await page.$x('//*[@id="SearchApplications"]')
            // await searchBtn.click();
            // await page.waitForXPath('//*[@module="Enforcement"]')
            // const [enforcementBtn] = await page.$x('//*[@module="Enforcement"]')
            // await enforcementBtn.click()
            // await page.waitForXPath('//*[@module="Enforcement"]/parent::div[1]/parent::td[contains(@class,"ACA_CenterOn")]')
            // await page.waitForXPath('//*[contains(@id,"txtGSStartDate")]')

            await this.setSearchCriteria1(page, month);
            // click search button
            const [searchBtn] = await page.$x('//*[contains(@id,"btnNewSearch")]')
            // await Promise.all([
            //     searchBtn.click(),
            //     page.waitForResponse((response) => response.url().includes('/CitizenAccess/Cap/Caphome.aspx') && response.status() === 200)
            // ]);

            await searchBtn.click();
            await page.waitForFunction('document.getElementById("divGlobalLoading").style.display == "block"')
            await page.waitForFunction('document.getElementById("divGlobalLoading").style.display == "none"');
            const [noresult] = await page.$x('//*[contains(text(), "No matching records found.")]');
            if (noresult) continue;

            await page.waitForXPath('//table[contains(@id, "dvPermitList")]/tbody/tr[position()>2]/td[3]//a');
            // get results
            counts += await this.getData1(page);
            await this.sleep(3000);
        }
        return counts;
    }

    async setSearchCriteria1(page: puppeteer.Page, month: number) {
        // get year
        let year = (new Date()).getFullYear();
        // page loaded successfully
        let endDay = new Date(year, month, 0).getDate();
        const startDate = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        const endDate = new Date(year, month - 1, endDay).toLocaleDateString('en-US', {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        console.log({startDate, endDate})
        const [startDateInput] = await page.$x('//*[contains(@id,"txtGSStartDate") and @type="text"]')
        await startDateInput.type(startDate, {delay: 100})
        const [endDateInput] = await page.$x('//*[contains(@id,"txtGSEndDate") and @type="text"]')
        await endDateInput.type(endDate, {delay: 100})
    }

    async getData1(page: puppeteer.Page) {
        let counts = 0;
        let arrayData = [];
        let nextPageFlag
        do {
            await page.waitForXPath('//table[contains(@id, "dvPermitList")]/tbody/tr[position()>2]/td[3]//a');
            nextPageFlag = false
            const rows = await page.$x('//table[contains(@id, "dvPermitList")]/tbody/tr[position()>2]');
            for (const row of rows) {
                try {
                    let fillingdate = await row.$eval('td:nth-child(2) > div > span', elem => elem.textContent);
                    let caseno = await row.$eval('td:nth-child(3) > div > a > strong > span', elem => elem.textContent);
                    // @ts-ignore
                    let link = await row.$eval('td:nth-child(3) > div > a', elem => elem.href);
                    arrayData.push({link, caseno, fillingdate});
                } catch (e) {
                }
            }
            const [nextPageBtn] = await page.$x('//a[text()="Next >"]')
            if (!!nextPageBtn) {
                await nextPageBtn.click();
                await page.waitForFunction('document.getElementById("divGlobalLoading").style.display == "block"')
                await page.waitForFunction('document.getElementById("divGlobalLoading").style.display == "none"');

                nextPageFlag = true
            }
        } while (nextPageFlag)

        for (const data of arrayData) {
            const {link, caseno, fillingdate} = data
            await this.openPage(page, link, '//*[@class="search_results"]');

            let casetype = await this.getTextByXpathFromPage(page, '//*[text()="Violation Code:"]/parent::div[1]/following-sibling::div[1]/span');
            const tableDataElement = await page.$x('//*[text()="Owner:"]/parent::h1[1]/following-sibling::span[1]//table//table/tbody/tr');
            let countIterationSaveAddress = 0
            let property_addresss = ''
            let ownername = ''
            for (let i = tableDataElement.length - 1; i >= 0; i--) {
                const text = (await tableDataElement[i].$eval('td:nth-child(1)', elem => elem.textContent))?.trim();
                if (!!text && countIterationSaveAddress < 2) {
                    property_addresss = text + ' ' + property_addresss
                    countIterationSaveAddress++
                    continue;
                }
                if (!!text && countIterationSaveAddress >= 2) {
                    ownername = text + ' ' + ownername
                    countIterationSaveAddress++
                    continue;
                }
            }
            const ownerArray = ownername.split(' AND ')

            for (const owner of ownerArray) {
                if (await this.saveRecord({
                    owner,
                    property_addresss,
                    mailing_address: property_addresss,
                    fillingdate,
                    casetype,
                    caseno
                })) {
                    counts++;
                }
            }

        }
        return counts;
    }

    async saveRecord(record: any) {
        const parseName: any = this.newParseName(record.owner.trim());
        if (parseName.type && parseName.type == 'COMPANY') {
            return false;
        }
        const data = {
            'First Name': parseName.firstName,
            'Last Name': parseName.lastName,
            'Middle Name': parseName.middleName,
            'Name Suffix': parseName.suffix,
            'Full Name': parseName.fullName,
            'Mailing Address': record.mailing_address.trim(),
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': record.property_addresss.trim(),
            "propertyAppraiserProcessed": false,
            "landgridPropertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            "caseUniqueId": record.caseno.trim(),
            fillingDate: record.fillingdate.trim(),
            originalDocType: record.casetype.trim()
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}