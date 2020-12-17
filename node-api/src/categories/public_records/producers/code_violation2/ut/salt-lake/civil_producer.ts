import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import axios from 'axios';
import {countReset} from 'console';

export default class CivilProducer extends AbstractProducer {

    sources =
        [
            { url: 'https://saltlakecityut.citysourced.com/servicerequests/nearby', handler: this.handleSource1 }
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

    async getDateRange(): Promise<any> {
        const lastItemDB: any = await db.models.OwnerProductProperty.findOne({
            productId: this.productId,
            codeViolationId: {$ne: null}
        }).sort({createdAt: -1}).exec();
        let date: any;
        if (lastItemDB && lastItemDB.fillingDate) {
            date = new Date(lastItemDB.fillingDate);
        } else {
            date = new Date();
            date.setDate(date.getDate() - 30);
        }
        let today = new Date();
        return {
            from: date,
            to: today
        };
    }

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
        let dateRange = await this.getDateRange();
        let date = dateRange.from;
        let today = dateRange.to;
        let days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24)) - 1;
        // load page
        const isPageLoaded = await this.openPage(page, link, '//*[contains(@id,"txtGSStartDate")]');
        if (!isPageLoaded) {
            return counts
        }
        await page.waitForResponse('https://saltlakecityut.citysourced.com/pages/ajax/callapiendpoint.ashx')
        await this.setSearchCriteria1(page, days);
        const response:any =await( await page.waitForResponse('https://saltlakecityut.citysourced.com/pages/ajax/callapiendpoint.ashx')).json()
        counts += await this.getData1(response.Results);
        await this.sleep(3000);

        return counts;
    }

    async setSearchCriteria1(page: puppeteer.Page, days: number) {
        await page.waitForXPath('//*[@data-target="#csFiltersModal"]')
        const [filterBtn] = await page.$x('//*[@data-target="#csFiltersModal"]')
        await filterBtn.click()
        let selectOption
        await page.waitForXPath('//*[@id="csFiltersModal" and contains(@class, "show")]')
        if (days > 7) {
            selectOption = '3'
        } else {
            selectOption = '1'
        }
        await page.select('#numDateFilter',selectOption)
        const [applyFilters] = await page.$x('//*[@id="csFiltersModal"]//*[contains(text(),"Apply Filters")]')
        await applyFilters.click()
    }

    async getData1(data:any) {
        let counts = 0;
        for (const datum of data) {
            const fillingdate = (new Date(datum.DateCreated)).toLocaleDateString('en-US', {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            })

            if (await this.saveRecord({
                property_addresss: datum.FormattedAddress,
                fillingdate,
                casetype:datum.RequestType,
                caseno:datum.Id
            })) {
                counts++;
           }
        }
        return counts;
    }

    async saveRecord(record: any) {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': record.property_addresss,
            "propertyAppraiserProcessed": false,
            "landgridPropertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            "caseUniqueId": record.caseno.toString(),
            fillingDate: record.fillingdate,
            originalDocType: record.casetype
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}