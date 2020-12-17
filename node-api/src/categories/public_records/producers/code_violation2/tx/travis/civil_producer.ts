import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import axios from 'axios';
import {countReset} from 'console';

export default class CivilProducer extends AbstractProducer {

    sources =
        [
            { url: 'https://citizenconnect-acd.austintexas.gov/#!/dashboard', handler: this.handleSource1 }
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
        for (let i = days < 0 ? 1 : days; i >= 0; i--) {
            let dateSearch = new Date();
            dateSearch.setDate(dateSearch.getDate() - i);
            const dateArray = dateSearch.toLocaleDateString('en-US', {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).split('\/');
            const searchDay = `${dateArray[2]}-${dateArray[0]}-${dateArray[1]}`
            const response = await axios.get(`https://citizenconnect-acd.austintexas.gov/api/tickets/details.json?categories=3:T&end_date=${searchDay}&lat1=30.965770801010027&lat2=29.423203936933216&lng1=-96.50414811761826&lng2=-98.9428069453414&search_field=&search_value=&shape_group_id=jcrc-4uuy&shape_ids=&start_date=${searchDay}&statusFilter=&zoom=9`)
            // get results

            counts += await this.getData1(response.data.records, dateSearch.toLocaleDateString('en-US', {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }));
            await this.sleep(3000);
        }

        return counts;
    }

    async getData1(data: any, fillingdate: string) {
        let counts = 0;
        for (const row of data) {
            if (await this.saveRecord({
                property_addresss: row.street_address,
                fillingdate,
                casetype: row.ticket_detail_entry5 ? row.ticket_detail_entry5 : '',
                caseno: row.ticket_id
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