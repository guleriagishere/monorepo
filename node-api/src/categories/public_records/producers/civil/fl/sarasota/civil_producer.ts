import AbstractProducer from '../../../abstract_producer';
import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';

import puppeteer from 'puppeteer';
import axios from 'axios';
import db from '../../../../../../models/db';
import { sleep } from '../../../../../../core/sleepable';

export default class CivilProducer extends AbstractProducer {
    browser: puppeteer.Browser | undefined;
    browserPages = {
        generalInfoPage: undefined as undefined | puppeteer.Page
    };
    urls = {
        generalInfoPage: 'https://secure.sarasotaclerk.com/'
    }

    xpaths = {
        isPAloaded: '//label[contains(., "General Public User Access:")]'
    }

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
            await this.browserPages.generalInfoPage.goto(this.urls.generalInfoPage, { waitUntil: 'load' });
            return true;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }

    async read(): Promise<boolean> {
        try {
            await this.browserPages.generalInfoPage?.waitForXPath(this.xpaths.isPAloaded);
            return true;
        } catch (err) {
            console.warn('Problem loading civil producer page.');
            return false;
        }
    }

    // To check empty or space
    isEmptyOrSpaces(str: string) {
        return str === null || str.match(/^\s*$/) !== null;
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

    // This is main function
    async parseAndSave(): Promise<boolean> {
        const civilUrl: string = 'https://secure.sarasotaclerk.com/';

        let page = this.browserPages.generalInfoPage!;
        let retryCount = 0;
        let countRecords = 0;
        while (true) {
            if (retryCount > 15) {
                console.log("Connection/website error.");
                return false;
            }
            try {
                await page.goto(civilUrl, { waitUntil: 'networkidle0' });
                await Promise.all([
                    page.click('a#cphBody_hlAnon'),
                    page.waitForNavigation()
                ]);

                // resolve captcha by capturing the image
                let captchaEl = await page.$('img#ctl00_cphBody_rcCap_CaptchaImage');
                let base64String = await captchaEl?.screenshot({ encoding: "base64" });
                try {
                    console.log("Resolving captcha...");
                    const captchaSolution: any = await this.resolveRecaptcha(base64String);
                    let captchaHandle = await page.$('input#ctl00_cphBody_rcCap_CaptchaTextBox');
                    await captchaHandle?.type(captchaSolution);
                    await Promise.all([
                        page.waitForNavigation(),
                        page.click('input#cphBody_bAgree')
                    ]);
                } catch (error) {
                    console.log('Error during resolving captcha: ', error);
                    return false;
                }

                // click search on navbar
                await page.waitForXPath('//a[./span[contains(., "Search")]]', { visible: true });
                let searchButton = await page.$x('//a[./span[contains(., "Search")]]');
                await Promise.all([
                    page.waitForNavigation(),
                    searchButton[0].click()
                ]);

                // fill the input
                await page.click('input#ctl00_cphBody_rcbCourtType_Input');
                await page.waitFor(2000);
                let civilSelect = await page.$x('//label[contains(.,"Civil")]/input');
                await civilSelect[0].click();
                let dateRange = await this.getDateRange('Florida', 'Sarasota');
                let fromDate = dateRange.from;
                let toDate = dateRange.to;
                let fromDateString = this.getFormattedDate(fromDate);
                let toDateString = this.getFormattedDate(toDate);
                console.log(fromDateString, toDateString);
                await Promise.all([
                    page.waitForNavigation(),
                    page.click('input#ctl00_cphBody_rdStart_dateInput')
                ]);
                await page.type('input#ctl00_cphBody_rdStart_dateInput', fromDateString, { delay: 150 });
                await page.type('input#ctl00_cphBody_rdEnd_dateInput', toDateString, { delay: 150 });
                await Promise.all([
                    page.waitForNavigation(),
                    page.click('input#ctl00_cphBody_bSearch_input')
                ]);
                await page.click('input#ctl00_cphBody_rgCaseList_ctl00_ctl03_ctl01_PageSizeComboBox_Input');
                await page.waitFor(2000);
                let pageSize = await page.$x('//li[contains(.,"50")]');
                await Promise.all([
                    page.waitForNavigation(),
                    pageSize[0].click()
                ]);
                await this.randomSleepIn5Sec();
                break;
            } catch {
                retryCount += 1;
            }
        }
        try {
            // process each page
            let nextPage = true;
            while (nextPage) {
                let caseNumberArray = [];
                let caseTypeArray = [];
                let caseFileDateArray = [];
                let caseNumberHandles = await page.$x('//table/tbody/tr[contains(@id,"rgCaseList")]/td[1]');
                for (const caseNumberHandle of caseNumberHandles) {
                    const caseNumberString = await caseNumberHandle.evaluate(el => el.textContent?.trim());
                    caseNumberArray.push(caseNumberString);
                }
                let caseFileDateHandles = await page.$x('//table/tbody/tr[contains(@id,"rgCaseList")]/td[5]');
                for (const caseFileDateHandle of caseFileDateHandles) {
                    const caseFileDateString = await caseFileDateHandle.evaluate(el => el.textContent?.trim());
                    caseFileDateArray.push(caseFileDateString);
                }
                let caseTypeHandles = await page.$x('//table/tbody/tr[contains(@id,"rgCaseList")]/td[6]');
                for (const caseTypeHandle of caseTypeHandles) {
                    const caseTypeString = await caseTypeHandle.evaluate(el => el.textContent?.trim());
                    caseTypeArray.push(caseTypeString);
                }
                console.log("Found:", caseNumberArray.length);
                for (let i = 0; i < caseNumberArray.length; i++) {
                    let caseNumber = caseNumberArray[i];
                    let caseType: any = caseTypeArray[i];
                    let practiceType = this.getPracticeType(caseType);
                    let caseFileDate = caseFileDateArray[i];
                    let indexPartyName = i + 1;
                    const partyNamesXpath = '//table/tbody/tr[contains(@id,"rgCaseList")][' + indexPartyName + ']/td[4]/text()';
                    let partyNamesHandles = await page.$x(partyNamesXpath);
                    let partyNameArray = [];
                    for (const partyNamesHandle of partyNamesHandles) {
                        const partyNameString = await partyNamesHandle.evaluate(el => el.textContent?.trim());
                        partyNameArray.push(partyNameString);
                    }
                    // console.log(partyNameArray);
                    for (const partyName of partyNameArray) {
                        let name = partyName?.replace(/\(.*?\)/, '');
                        if (this.isEmptyOrSpaces(name!)) {
                            continue;
                        }
                        if (name?.match(/sarasota/i)) {
                            continue;
                        }
                        const parseName: any = this.newParseName(name!.trim());
                        if(parseName.type && parseName.type == 'COMPANY'){
                            continue;
                        }

                        const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
                        const prod = await db.models.Product.findOne({ name: productName }).exec();
                        const data = {
                            'caseUniqueId': caseNumber,
                            'Property State': 'FL',
                            'County': 'Sarasota',
                            'First Name': parseName.firstName,
                            'Last Name': parseName.lastName,
                            'Middle Name': parseName.middleName,
                            'Name Suffix': parseName.suffix,
                            'Full Name': parseName.fullName,
                            "propertyAppraiserProcessed": false,
                            "vacancyProcessed": false,
                            fillingDate: caseFileDate,
                            "productId": prod._id,
                            originalDocType: caseType
                        };

                        if (await this.civilAndLienSaveToNewSchema(data))
                            countRecords += 1;
                    }
                }
                let lastNumPageHandle = await page.$x('//div[contains(@class, "rgNumPart")]/a[last()]/span/text()');
                let lastNumPage = await page.evaluate(el => el.textContent, lastNumPageHandle[0]);
                let currentPageHandle = await page.$x('//div[contains(@class, "rgNumPart")]/a[contains(@class, "rgCurrentPage")]/span/text()');
                let currentPage = await page.evaluate(el => el.textContent, currentPageHandle[0]);
                if (lastNumPage == currentPage) {
                    nextPage = false;
                } else {
                    await Promise.all([
                        page.waitForNavigation(),
                        page.click('input.rgPageNext')
                    ]);
                }
                await this.randomSleepIn5Sec();
            }
            await AbstractProducer.sendMessage('Sarasota', 'Florida', countRecords, 'Civil');
            return true;
        } catch (error) {
            console.log('Error:', error);
            const errorImage = await this.uploadImageOnS3(page);
            await AbstractProducer.sendMessage('Sarasota', 'Florida', countRecords, 'Civil', errorImage);
            return true;
        }
        
    }
}