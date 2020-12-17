import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import {IPublicRecordProducer} from '../../../../../../models/public_record_producer';

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
        generalInfoPage: 'https://countyfusion10.kofiletech.us/countyweb/login.do?countyname=LexingtonSC'
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

    promiseTimeout(ms: number, promise: any) {
        // Create a promise that rejects in <ms> milliseconds
        let timeout = new Promise((resolve, reject) => {
            let id = setTimeout(() => {
                clearTimeout(id);
                reject('Timed out in ' + ms + 'ms.')
            }, ms)
        })

        // Returns a race between our timeout and the passed in promise
        return Promise.race([
            promise,
            timeout
        ])
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

    async initiateCaptchaRequest(base64String: any) {
        const formData = {
            method: 'base64',
            key: '7739e42f32c767e3efc0303331a246fb',
            json: 1,
            body: base64String
        };

        try {
            const resp = await axios.post('https://2captcha.com/in.php', formData);
            if (resp.status == 200) {
                const respObj = resp.data;
                console.log(respObj)
                if (respObj.status == 0) {
                    return Promise.reject(respObj.request);
                } else {
                    return Promise.resolve(respObj.request);
                }
            } else {
                console.warn(`2Captcha request failed, Status Code: ${resp.status}, INFO: ${resp.data}`);
                return Promise.reject('Error');
            }
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async resolveRecaptcha(base64String: any, maxTryNo = 7) {
        try {
            const reqId = await this.initiateCaptchaRequest(base64String);
            console.log('captcha requested. awaiting results.')
            await sleep(20000);
            for (let tryNo = 1; tryNo <= maxTryNo; tryNo++) {
                try {
                    const result = await this.requestCaptchaResults(reqId);
                    console.log(result);
                    return Promise.resolve(result);
                } catch (err) {
                    console.warn(err);
                    await sleep(20000);
                }
            }
            Promise.reject('Captcha not found within time limit');
        } catch (err) {
            console.warn(err);
            Promise.reject(err);
        }
    }

    async requestCaptchaResults(requestId: any) {
        const url = `http://2captcha.com/res.php?key=7739e42f32c767e3efc0303331a246fb&action=get&id=${requestId}&json=1`;
        return new Promise(async (resolve, reject) => {
            const rawResponse = await axios.get(url);
            const resp = rawResponse.data;
            if (resp.status === 0) {
                console.log(resp);
                return reject(resp.request);
            }
            console.log(resp)
            return resolve(resp.request);
        })
    }

    async saveRecord(fillingDate: string, parseName: any, prod: any, originalDocType: string) {
        const data = {
            'Property State': 'SC',
            'County': 'lexington',
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
                const resultFrame: any = await this.waitForFrame(page, 'resultFrame')
                try {
                    await resultFrame.waitForSelector('iframe#img', {timeout: 10000})
                    let captchaEl = await resultFrame.$('iframe#img');
                    let base64String = await captchaEl?.screenshot({encoding: "base64"});

                    console.log("Resolving captcha...");
                    const captchaSolution: any = await this.resolveRecaptcha(base64String);
                    let captchaHandle = await resultFrame.$('input#code');
                    await captchaHandle?.type(captchaSolution);
                    await Promise.all([
                        resultFrame.click('input[type="button"][value="OK"]')
                    ]);
                } catch (e) {

                }
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log('step 1')
                await frame.waitForFunction('document.getElementById("resultFrame").style.visibility == "visible"');
                console.log('step 2')

                await new Promise(resolve => setTimeout(resolve, 2000));
                let countReload = 0;
                let flagReload = false
                let resultListFrame, rows;
                do {
                    try {
                        countReload++
                        resultListFrame = await this.promiseTimeout(30000, this.waitForFrame(page, 'resultListFrame'))
                        console.log('step 3')
                        if (!resultListFrame) {
                            flagReload = true
                        }
                        rows = await resultListFrame.$x('//*[@class="datagrid-btable"]/tbody/tr')
                    } catch (e) {
                        flagReload = true
                    }
                    if (countReload > 3) {
                        return count
                    }
                } while (flagReload)

                for (let i = 0; i < rows.length; i++) {
                    const [docTypeElement] = await resultListFrame.$x(`//*[@class="datagrid-btable"]/tbody/tr[${i + 1}]//td[@field="4"]/div`);
                    const [namesElement] = await resultListFrame.$x(`//*[@class="datagrid-btable"]/tbody/tr[${i + 1}]//td[@field="8"]/div/span`);
                    let docType = (await resultListFrame.evaluate((e: any) => e.innerText, docTypeElement)).trim();
                    const names = (await resultListFrame.evaluate((e: any) => e.innerText, namesElement)).trim();
                    const nameArray = names.split('\n');
                    let practiceType = this.getPracticeType(docType!);
                    const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
                    const prod = await db.models.Product.findOne({name: productName}).exec();
                    for (let j = 0; j < nameArray.length; j++) {
                        const name = nameArray[j];
                        if (removeRowRegex.test(name)) continue;
                        if (/^na$/i.test(name)) continue;
                        if (!name) continue;
                        const parseName: any = this.newParseName(name!.trim());
                        if (parseName.type && parseName.type == 'COMPANY') {
                            continue;
                        }
                        const saveRecord = await this.saveRecord(fillingDate, parseName, prod, docType);
                        saveRecord && count++
                    }
                }
                const subnavFrame: any = await this.waitForFrame(page, 'subnav');
                const [nextPage] = await subnavFrame.$x('//*[@alt="Go to next result page"]');
                if (!!nextPage) {
                    await nextPage.click();
                    await frame.waitForFunction('document.getElementById("progressContent").style.visibility == "hidden"');
                    nextPageFlag = true;
                }
            } while (nextPageFlag)
            const resnavframe: any = await this.waitForFrame(page, 'resnavframe');
            await resnavframe.click('#img4');
            await frame.waitForFunction('document.getElementById("dynSearchContent").style.visibility == "visible"');
        } catch (e) {
            console.log(e)
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
        if (page === undefined
        )
            return false;
        let countRecords = 0;
        try {
            await this.randomSleepIn5Sec()
            const [clickCivilUnionBtn] = await page.$x('//*[@type="button" and contains(@value, "Login as Guest")]');
            await Promise.all([
                clickCivilUnionBtn.click(),
                page.waitForNavigation()
            ]);
            await this.randomSleepIn5Sec()
            await page.waitForXPath('//iframe[@name="bodyframe"]');
            const frame: any = await page.frames().find(frame => frame.name() === 'bodyframe');
            await frame?.waitForSelector('#accept', {visible: true})
            await Promise.all([
                frame?.click('#accept'),
                page.waitForNavigation()
            ]);

            try {
                await page.waitForXPath('//*[@id="dialogheader"]//a')
                const [cancelNotificationBtn] = await page.$x('//*[@id="dialogheader"]//a');
                await cancelNotificationBtn.click();
            } catch (e) {

            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.waitForXPath('//*[@id="menudiv"]//*[contains(text(), "Search Public Records")]');
            const [searchPublicRecordsBtn] = await page.$x('//*[@id="menudiv"]//*[contains(text(), "Search Public Records")]');
            await searchPublicRecordsBtn.click()
            let dateRange = await this.getDateRange('South Carolina', 'Lexington');
            let date = dateRange.from;
            let today = dateRange.to;
            let days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24)) - 1;
            for (let i = days < 0 ? 1 : days; i >= 0; i--) {
                try {
                    let dateSearch = new Date();
                    dateSearch.setDate(dateSearch.getDate() - i);
                    console.log('Start search with date: ', dateSearch.toLocaleDateString('en-US'))
                    await page.waitForXPath('//iframe[@name="bodyframe"]');
                    const dynSearchFrame: any = await this.waitForFrame(page, 'dynSearchFrame');
                    await dynSearchFrame.waitForXPath('//*[@id="searchTypes"]//*[contains(text(),"All Names")]');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const [clickAllNames] = await dynSearchFrame.$x('//*[@id="searchTypes"]//*[contains(text(),"All Names")]')
                    await clickAllNames.click({count: 3});

                    await dynSearchFrame.waitForSelector('#imgClear');
                    await dynSearchFrame.click('#imgClear')

                    const criteriaFrame: any = await this.waitForFrame(page, 'criteriaframe');
                    await criteriaFrame.waitForXPath('//*[@id="FROMDATE"]/following-sibling::span[1]/input[1]');
                    const [dateFromElement] = await criteriaFrame?.$x('//*[@id="FROMDATE"]/following-sibling::span[1]/input[1]');
                    await new Promise(resolve => setTimeout(resolve, 2000));

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
                    console.log(e)
                }
            }
        } catch (e) {
            console.log(e)
            console.log('Error search');
            await AbstractProducer.sendMessage('Lexington', 'South Carolina', countRecords, 'Civil & Lien');
            return false
        }
        await AbstractProducer.sendMessage('Lexington', 'South Carolina', countRecords, 'Civil & Lien');
        return true;
    }
}