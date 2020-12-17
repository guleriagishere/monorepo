import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';

import axios from 'axios';
import {sleep} from "../../../../../../core/sleepable";

const removeRowArray = [
    'CITY', 'DEPT', 'CTY', 'UNITED STATES', 'BANK', 'FIA CARD SERVICES NA',
    'FLORIDA PACE FUNDING AGENCY', 'COUNTY', 'CREDIT', 'HOSPITAL', 'FUNDING', 'UNIVERSITY',
    'MEDICAL', 'CONDOMINIUM ASSOCIATION', 'LOTS', 'TEXAS STATE', 'VETERANS', 'SECRETARY', 'DEPARTMENT',
]
const removeRowRegex = new RegExp(`\\b(?:${removeRowArray.join('|')})\\b`, 'i')

export default class CivilProducer extends AbstractProducer {

    urls = {
        generalInfoPage: 'https://apps.epcounty.com/publicrecords/OfficialPublicRecords'
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
            await this.browserPages.generalInfoPage?.waitForXPath('//*[@id="InstrumentDateFrom"]');
            return true;
        } catch (err) {
            console.warn('Problem loading property appraiser page.');
            return false;
        }
    }

    async checkExistElement(page: puppeteer.Page, selector: string): Promise<Boolean> {
        const exist = await page.$(selector).then(res => res !== null);
        return exist;
    }

    async checkForRecaptcha(page: puppeteer.Page) {
        const isRecaptcha = await this.checkExistElement(page, 'div#reCaptchaV2');
        if (isRecaptcha) {
            // captcha
            console.log("Resolving captcha...");
            const captchaSolution: any = await this.resolveRecaptcha('6LdT5GAUAAAAAPyYHsUBhbLOWoKksjcg-p4oxx7a', await page.url());
            let recaptchaHandle = await page.$x('//*[@id="g-recaptcha-response"]');
            await recaptchaHandle[0].evaluate((elem: any, captchaSolution: any) => {
                elem.innerHTML = captchaSolution
            }, captchaSolution);
            console.log("Done.");
            let submit_recaptcha = await page.$x('//input[@id="submit"]');
            await Promise.all([
                submit_recaptcha[0].click(),
                page.waitForNavigation()
            ]);
        }
        return;
    }

    async initiateCaptchaRequest(siteKey: any, pageUrl: any) {
        const formData = {
            method: 'userrecaptcha',
            googlekey: siteKey,
            key: '7739e42f32c767e3efc0303331a246fb',
            pageurl: pageUrl,
            json: 1,
            Invisible: true,
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

    async resolveRecaptcha(siteKey: any, pageUrl: any, maxTryNo = 7) {
        try {
            const reqId = await this.initiateCaptchaRequest(siteKey, pageUrl);
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
            'Property State': 'TX',
            'County': 'El Paso',
            'First Name': parseName.firstName,
            'Last Name': parseName.lastName,
            'Middle Name': parseName.middleName,
            'Name Suffix': parseName.suffix,
            'Full Name': parseName.fullName,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            fillingDate: fillingDate,
            productId: prod._id,
            originalDocType
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }

    async getData(page: puppeteer.Page, fillingDate: string) {
        let count = 0;
        let nextPageFlag;
        try {
            do {
                nextPageFlag = false;
                await page.waitForXPath('//*[contains(text(), "Official Public Records Results")]');
                const rows = await page.$x('//*[@id="page-container"]/table/tbody/tr');
                for (let i = 1; i < rows.length; i++) {
                    const nameType = (await rows[i].$eval('td:nth-child(5)', elem => elem.textContent))!.trim();
                    if (/Grantor/i.test(nameType)) continue;
                    const name = (await rows[i].$eval('td:nth-child(4)', elem => elem.textContent))!.trim();
                    if (removeRowRegex.test(name)) continue;
                    const docType = (await rows[i].$eval('td:nth-child(9)', elem => elem.textContent))!.trim();
                    if(/death/i.test(docType) || /birth/i.test(docType)) continue;
                    
                    let practiceType = this.getPracticeType(docType);
                    const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
                    const prod = await db.models.Product.findOne({name: productName}).exec();
                    const parseName: any = this.newParseName(name);
                    if (parseName.type === 'COMPANY' || parseName.fullName === '') continue;
                    const saveRecord = await this.saveRecord(fillingDate, parseName, prod, docType);
                    saveRecord && count++
                }

                const [nextPage] = await page.$x('//a[@rel="next"]');

                if (!!nextPage) {
                    await Promise.all([
                        nextPage.click(),
                        page.waitForNavigation()
                    ]);
                    nextPageFlag = true;
                }
            } while (nextPageFlag)

        } catch (e) {
        }
        return count
    }

    async parseAndSave(): Promise<boolean> {
        const page = this.browserPages.generalInfoPage;
        if (page === undefined) return false;
        let countRecords = 0;
        try {
            let dateRange = await this.getDateRange('Texas', 'El Paso');
            let date = dateRange.from;
            let today = dateRange.to;
            let days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24)) - 1;
            for (let i = days < 0 ? 1 : days; i >= 0; i--) {
                try {
                    let dateSearch = new Date();
                    dateSearch.setDate(dateSearch.getDate() - i);
                    console.log('Start search with date: ', dateSearch.toLocaleDateString('en-US'));
                    await page.goto('https://apps.epcounty.com/publicrecords/OfficialPublicRecords');
                    await page.waitForSelector('#InstrumentDateFrom');
                    await page.evaluate(() => {
                        // @ts-ignore
                        document.querySelector('#InstrumentDateFrom').value = '';
                        // @ts-ignore
                        document.querySelector('#InstrumentDateTo').value = '';
                    });
                    await page.type('#InstrumentDateFrom', dateSearch.toLocaleDateString('en-US'), {delay: 100});
                    await page.type('#InstrumentDateTo', dateSearch.toLocaleDateString('en-US'), {delay: 100});
                    await page.click('#submit');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await this.checkForRecaptcha(page);
                    const count = await this.getData(page, dateSearch.toLocaleDateString('en-US'));

                    countRecords += count;
                    console.log(`${dateSearch.toLocaleDateString('en-US')} found ${count} records.`);
                } catch (e) {
                }
            }
        } catch (e) {
            console.log(e);
            console.log('Error search');
            await AbstractProducer.sendMessage('El Paso', 'Texas', countRecords, 'Civil');
            return false;
        }
        await AbstractProducer.sendMessage('El Paso', 'Texas', countRecords, 'Civil');
        return true;
    }
}

