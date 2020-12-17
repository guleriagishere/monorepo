import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';

import axios from "axios";
import {sleep} from "../../../../../../core/sleepable";

const removeRowArray = [
    'CITY', 'DEPT', 'CTY', 'UNITED STATES', 'BANK', 'FIA CARD SERVICES NA',
    'FLORIDA PACE FUNDING AGENCY', 'COUNTY', 'CREDIT', 'HOSPITAL', 'FUNDING', 'UNIVERSITY',
    'MEDICAL', 'CONDOMINIUM ASSOCIATION', 'LOTS', 'TEXAS STATE', 'VETERANS', 'SECRETARY', 'DEPARTMENT', 'TITLE',
    'FIRSTBANK',
]
const removeRowRegex = new RegExp(`\\b(?:${removeRowArray.join('|')})\\b`, 'i')


export default class CivilProducer extends AbstractProducer {

    urls = {
        generalInfoPage: 'https://countyfusion2.kofiletech.us/countyweb/login.do?countyname=EddyNM'
    };

    constructor(publicRecordProducer: IPublicRecordProducer) {
        // @ts-ignore
        super();
        this.publicRecordProducer = publicRecordProducer;
        this.stateToCrawl = this.publicRecordProducer?.state || '';
    }

    async init(): Promise<boolean> {
        this.browser = await this.launchBrowser();
        this.browserPages.generalInfoPage = await this.browser.newPage();
        await this.setParamsForPage(this.browserPages.generalInfoPage);
        try {
            await this.browserPages.generalInfoPage.goto(this.urls.generalInfoPage, {waitUntil: 'load'});
            return true;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }

    async read(): Promise<boolean> {
        try {
            await this.browserPages.generalInfoPage?.waitForXPath('//*[@type="button" and contains(@value, "Login as Guest")]');
            return true;
        } catch (err) {
            console.warn('Problem loading property appraiser page.');
            return false;
        }
    }

    async saveRecord(fillingDate: string, parseName: any, prod: any, originalDocType: string) {

        const data = {
            'Property State': 'NM',
            'County': 'Eddy',
            'First Name': parseName.firstName,
            'Last Name': parseName.lastName,
            'Middle Name': parseName.middleName,
            'Name Suffix': parseName.suffix,
            'Full Name': parseName.fullName,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            fillingDate: fillingDate,
            productId: prod._id,
            originalDocType: originalDocType
        };

        return await this.civilAndLienSaveToNewSchema(data);
    }

    async getData(page: puppeteer.Page, fillingDate: string) {
        let count = 0;
        let nextPageFlag;
        const frame: any = await this.waitForFrame(page, 'bodyframe')
        try {
            do {
                nextPageFlag = false;
                await frame.waitForFunction('document.getElementById("resultFrame").style.visibility == "visible"');
                const resultListFrame: any = await this.waitForFrame(page, 'resultListFrame')
                const rows = await resultListFrame.$x('//*[@class="datagrid-btable"]/tbody/tr')
                for (let i = 0; i < rows.length; i++) {
                    const [docTypeElement] = await resultListFrame.$x(`//*[@class="datagrid-btable"]/tbody/tr[${i + 1}]//td[@field="9"]/div`);
                    const [namesElement] = await resultListFrame.$x(`//*[@class="datagrid-btable"]/tbody/tr[${i + 1}]//td[@field="8"]/div/span`);
                    const docType = (await resultListFrame.evaluate((e: any) => e.innerText, docTypeElement)).trim();
                    if (docType == 'MARRIAGE LICENSE') continue;
                    const names = (await resultListFrame.evaluate((e: any) => e.innerText, namesElement)).trim();
                    const nameArray = names.split('\n');
                    let practiceType = this.getPracticeType(docType!)
                    const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
                    const prod = await db.models.Product.findOne({name: productName}).exec();
                    for (let j = 0; j < nameArray.length; j++) {
                        const name = nameArray[j];
                        if (removeRowRegex.test(name)) continue;
                        if (/^na$/i.test(name)) continue;
                        if (!name) continue;
                        const parseName = this.newParseName(name.trim());
                        const saveRecord = await this.saveRecord(fillingDate, parseName, prod, docType);
                        saveRecord && count++
                    }
                }
                const subnavFrame: any = await this.waitForFrame(page, 'subnav');
                const [nextPage] = await subnavFrame.$x('//*[@onclick="parent.navigateResults(\'next\'); return false;"]');
                if (!!nextPage) {
                    await nextPage.click();
                    await frame.waitForFunction('document.getElementById("progressContent").style.visibility == "visible"')
                    await frame.waitForFunction('document.getElementById("progressContent").style.visibility == "hidden"');
                    nextPageFlag = true;
                }
            } while (nextPageFlag)
            const resnavframe: any = await this.waitForFrame(page, 'resnavframe');
            await resnavframe.click('#img1');
            await frame.waitForFunction('document.getElementById("dynSearchContent").style.visibility == "visible"');
        } catch (e) {
        }
        return count
    }

    waitForFrame(page: puppeteer.Page, name: string) {
        let fulfill: any;
        const promise = new Promise(x => fulfill = x);
        checkFrame(name);
        return promise;

        function checkFrame(name: string) {
            const frame = page.frames().find(f => f.name() === name);
            if (frame)
                fulfill(frame);
            else
                page.once('frameattached', () => checkFrame(name));
        }
    }

    async parseAndSave(): Promise<boolean> {
        const page = this.browserPages.generalInfoPage;
        if (page === undefined) return false;
        let countRecords = 0;
        try {
            const [clickCivilUnionBtn] = await page.$x('//*[@type="button" and contains(@value, "Login as Guest")]');
            await Promise.all([
                clickCivilUnionBtn.click(),
                page.waitForNavigation()
            ]);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.waitForXPath('//*[@id="menudiv"]//*[contains(text(), "Search Public Records")]');
            const [searchPublicRecordsBtn] = await page.$x('//*[@id="menudiv"]//*[contains(text(), "Search Public Records")]');
            await searchPublicRecordsBtn.click()
            let dateRange = await this.getDateRange('New Mexico', 'Eddy');
            let date = dateRange.from;
            let today = dateRange.to;
            let days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24)) - 1;
            for (let i = days < 0 ? 1 : days; i >= 0; i--) {
                try {
                    let dateSearch = new Date();
                    dateSearch.setDate(dateSearch.getDate() - i);
                    console.log('Start search with date: ', dateSearch.toLocaleDateString('en-US'))
                    await page.waitForXPath('//iframe[@name="bodyframe"]')

                    const criteriaFrame: any = await this.waitForFrame(page, 'criteriaframe');
                    await criteriaFrame.waitForXPath('//*[@id="FROMDATE"]/following-sibling::span[1]/input[1]');
                    const [dateFromElement] = await criteriaFrame?.$x('//*[@id="FROMDATE"]/following-sibling::span[1]/input[1]');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const dynSearchFrame: any = await this.waitForFrame(page, 'dynSearchFrame');
                    await dynSearchFrame.waitForSelector('#imgClear');
                    await dynSearchFrame.click('#imgClear')
                    await dateFromElement.type(dateSearch.toLocaleDateString('en-US', {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    }), {delay: 100});
                    const [dateToElement] = await criteriaFrame?.$x('//*[@id="TODATE"]/following-sibling::span[1]/input[1]')
                    await dateToElement.type(dateSearch.toLocaleDateString('en-US', {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    }), {delay: 100});
                    await dynSearchFrame.click('#imgSearch');
                    const count = await this.getData(page, dateSearch.toLocaleDateString('en-US'));
                    countRecords += count;
                    console.log(`${dateSearch.toLocaleDateString('en-US')} save ${count} records.`);
                } catch (e) {
                }
            }
        } catch (e) {
            console.log(e)
            console.log('Error search');
            const errorImage = await this.uploadImageOnS3(page);
            await AbstractProducer.sendMessage('Eddy', 'New Mexico', countRecords, 'Civil & Lien', errorImage);
            return false
        }
        await AbstractProducer.sendMessage('Eddy', 'New Mexico', countRecords, 'Civil & Lien');
        return true;
    }
}