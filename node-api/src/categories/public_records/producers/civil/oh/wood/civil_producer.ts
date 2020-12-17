import AbstractProducer from '../../../abstract_producer';
import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';

import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import { sleep } from '../../../../../../core/sleepable';
import axios from 'axios';

export default class CivilProducer extends AbstractProducer {
    browser: puppeteer.Browser | undefined;
    browserPages = {
        generalInfoPage: undefined as undefined | puppeteer.Page
    };
    urls = {
        generalInfoPage: 'https://pub.clerkofcourt.co.wood.oh.us/eservices/home.page.2'
    }

    xpaths = {
        isPAloaded: '//a[*[contains(text(), "Click Here")]]'
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
    
    async initiateCaptchaRequest(siteKey: any, pageUrl: any) {
        const formData = {
            method: 'userrecaptcha',
            googlekey: siteKey,
            key: '7739e42f32c767e3efc0303331a246fb',
            pageurl: pageUrl,
            json: 1
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

    // This is main function
    async parseAndSave(): Promise<boolean> {
        const civilUrl: string = this.urls.generalInfoPage;
        let page = this.browserPages.generalInfoPage!;
        let countRecords = 0;

        try{
            await page.waitForXPath('//a[*[contains(text(), "Click Here")]]', {visible: true}); // Recaptcha page
            console.log("Resolving captcha...");
            let recaptchaSitekeyHandle = await page.$x('//*[@class="g-recaptcha"]');
            let siteKey = await recaptchaSitekeyHandle[0].evaluate((elem) => elem.getAttribute('data-sitekey'));
            let pageUrl = await page.url();
            const captchaSolution:any = await this.resolveRecaptcha(siteKey, pageUrl);
            let recaptchaHandle = await page.$x('//*[@id="g-recaptcha-response"]');
            await recaptchaHandle[0].evaluate((elem:any, captchaSolution:any) => elem.innerHTML = captchaSolution, captchaSolution);
            console.log("Done.");
            await page.waitFor(3000);
            let submit_recaptcha = await page.$x('//a[*[contains(text(), "Click Here")]]');
            await submit_recaptcha[0].click();

            const casetype_handle = await page.waitForXPath('//a[*[contains(text(), "Case Type")]]');
            if (casetype_handle) {
                await Promise.all([
                    casetype_handle.click(),
                    page.waitForNavigation()
                ]);
            } else {
                return false;
            }

            // get date range
            let dateRange = await this.getDateRange('Ohio', 'Wood');
            let fromDate = dateRange.from;
            let toDate = dateRange.to;
    
            let fromDateString = this.getFormattedDate(fromDate);
            let toDateString = this.getFormattedDate(toDate);            


            // input date range
            await page.waitForSelector('input[name="fileDateRange:dateInputBegin"]');
            await page.type('input[name="fileDateRange:dateInputBegin"]', fromDateString, {delay: 100});
            await page.type('input[name="fileDateRange:dateInputEnd"]', toDateString, {delay: 100});
            await page.select('select[name="caseCd"]', 'CV        ', 'DR        ', 'EL        ', 'FJ        ', 'JL        ', 'LF        ', 'MH        ', 'TL        ');
            await page.waitFor(100);
            await page.select('select[name="statCd"]', 'Open');
            await page.waitFor(100);
            await page.select('select[name="ptyCd"]', 'Defendant');
            await page.waitFor(100);
            try {
                await page.click('input[type="submit"]');
            } catch (error) {
                await page.click('input[type="submit"]');
            }
            
            let nextPage = true;
            while (nextPage) {
                try {
                    await page.waitForXPath('//table[@id="grid"]/tbody/tr');
                } catch (error) {
                
                    console.log(error);
                    return false;    
                };
                let resultRows = await page.$x('//table[@id="grid"]/tbody/tr');
                for (const row of resultRows) {
                    let names: string[] = [];
                    const party = await page.evaluate(el => el.children[5].textContent.trim(), row);
                    names = [party];
                    let recordDate = await page.evaluate(el => el.children[3].textContent.trim(), row);
                    let caseType = await page.evaluate(el => el.children[4].textContent.trim(), row);
                    let practiceType = this.getPracticeType(caseType);

                        for (const name of names) {
                        if (this.isEmptyOrSpaces(name!)) {
                            continue;
                        }
                        // console.log(name);
                        const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
                        const prod = await db.models.Product.findOne({ name: productName }).exec();
                        const parseName: any = this.newParseName(name!.trim());
                                    if (parseName.type === 'COMPANY' || parseName.fullName === '') continue;

                        const data = {
                            'Property State': 'OH',
                            'County': 'Wood',
                            'First Name': parseName.firstName,
                            'Last Name': parseName.lastName,
                            'Middle Name': parseName.middleName,
                            'Name Suffix': parseName.suffix,
                            'Full Name': parseName.fullName,
                            "propertyAppraiserProcessed": false,
                            "vacancyProcessed": false,
                            fillingDate: recordDate,
                            "productId": prod._id,
                            originalDocType: caseType
                        };

                        if (await this.civilAndLienSaveToNewSchema(data))
                            countRecords += 1;
                    }
                }
                const [next_page_enabled] = await page.$x('//a[@title="Go to next page"]');
                if (next_page_enabled) {
                    await Promise.all([
                        next_page_enabled.click(),
                        page.waitForNavigation()
                    ]);
                    await page.waitFor(this.getRandomInt(3000, 5000));
                }
                else {
                    nextPage = false;
                }
            }
            
            console.log(countRecords);
            await AbstractProducer.sendMessage('Wood', 'Ohio', countRecords, 'Civil & Lien');
            return true;
        } catch(e){
            console.log(e);
            await AbstractProducer.sendMessage('Wood', 'Ohio', countRecords, 'Civil & Lien');
            return true;
        }
    }
}