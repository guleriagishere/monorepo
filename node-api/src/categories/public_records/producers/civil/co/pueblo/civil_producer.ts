import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../abstract_producer';
import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';


const removeRowArray = [
    'CITY', 'DEPT', 'CTY', 'UNITED STATES', 'BANK', 'FIA CARD SERVICES NA',
    'FLORIDA PACE FUNDING AGENCY', 'COUNTY', 'CREDIT', 'HOSPITAL', 'FUNDING', 'UNIVERSITY',
    'MEDICAL', 'CONDOMINIUM ASSOCIATION', 'LOTS', 'TEXAS STATE', 'VETERANS', 'SECRETARY', 'DEPARTMENT',
]
const removeRowRegex = new RegExp(`\\b(?:${removeRowArray.join('|')})\\b`, 'i')


export default class CivilProducer extends AbstractProducer {

    urls = {
        generalInfoPage: 'https://erecording.co.pueblo.co.us/recorder/eagleweb/docSearch.jsp'
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
            await this.browserPages.generalInfoPage.goto(this.urls.generalInfoPage, { waitUntil: 'load' });
            return true;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }

    async read(): Promise<boolean> {
        try {
            await this.browserPages.generalInfoPage?.waitForXPath('//*[@id="middle_left"]');
            return true;
        } catch (err) {
            console.warn('Problem loading property appraiser page.');
            return false;
        }
    }

    async getData(page: puppeteer.Page) {
        let count = 0;
        try {
            await page.waitForSelector('#right_column');
            const [noResults] = await page.$x('//*[contains(text(), "No results found")]');
            if (!!noResults) return count;
            await page.waitForSelector('#searchResultsTable');
            let nextPageFlag;
            do {
                const rows = await page.$x('//*[@id="searchResultsTable"]/tbody/tr');
                nextPageFlag = false;
                for (let i = 1; i < rows.length; i++) {

                    let nameHandle = await page.$x(`//*[@id="searchResultsTable"]/tbody/tr[${i}]/td[2]/a[contains(.,"Grantor")]`)
                    if (nameHandle.length > 0) {
                        const [dateElement] = await page.$x(`//*[@id="searchResultsTable"]/tbody/tr[${i}]/td[2]/a`);
                        const recordDate = await dateElement.evaluate(el => el.textContent?.split(':')[1].split(' ')[1]);
                        const [typeElement] = await page.$x(`//*[@id="searchResultsTable"]/tbody/tr[${i}]/td[1]/strong/a`);
                        const typeElementArray = await typeElement.evaluate(el => el.innerHTML?.trim());
                        let docType = await typeElementArray.split('<br>');

                        let clickDetailHandle = await page.$x(`//*[@id="searchResultsTable"]/tbody/tr[${i}]/td[2]/a`);
                        await clickDetailHandle[0].click();
                        try {
                            await page.waitForXPath('//th[contains(.,"Grantor")]/parent::tr/parent::tbody/tr/td/span');
                        } catch (err) {
                            continue
                        }

                        const Grantors = await page.$x('//th[contains(.,"Grantor")]/parent::tr/parent::tbody/tr/td/span');
                        const Grantes = await page.$x('//th[contains(.,"Grantee")]/parent::tr/parent::tbody/tr/td/span');
                        let names = [];
                        try {
                            for (let j = 0; j < Grantors.length; j++) {
                                let nameFull = await Grantors![j].evaluate(el => el.textContent);
                                names.push(nameFull!.trim())

                            }
                        } catch (err) {

                        }
                        try {
                            for (let j = 0; j < Grantes.length; j++) {
                                let nameFull = await Grantes![j].evaluate(el => el.textContent);
                                names.push(nameFull!.trim())

                            }
                        } catch (err) {
                            try {
                                const Beneficiary = await page.$x('//th[contains(.,"Beneficiary trustee")]/parent::tr/parent::tbody/tr/td/span');
                                for (let j = 0; j < Beneficiary.length; j++) {
                                    let nameFull = await Beneficiary![j].evaluate(el => el.textContent);
                                    names.push(nameFull!.trim())
                                }
                            } catch (err) {

                            }
                        }

                        if (names.length > 0) {

                            let practiceType = this.getPracticeType(docType[0].replace(/&amp;/g, '&').trim());
                            console.log(names)
                            for (let name of names) {
                                name = name?.replace(/\(PERS REP\)/, '');
                                if (name == '...') {
                                    continue
                                }
                                const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
                                const prod = await db.models.Product.findOne({ name: productName }).exec();
                                const parseName: any = this.newParseName(name!.trim());
                                if (parseName.type && parseName.type == 'COMPANY') {
                                    continue;
                                }

                                const data = {
                                    'Property State': 'CO',
                                    'County': 'Pueblo',
                                    'First Name': parseName.firstName,
                                    'Last Name': parseName.lastName,
                                    'Middle Name': parseName.middleName,
                                    'Name Suffix': parseName.suffix,
                                    'Full Name': parseName.fullName,
                                    "propertyAppraiserProcessed": false,
                                    "vacancyProcessed": false,
                                    fillingDate: recordDate,
                                    "productId": prod._id,
                                    originalDocType: docType[0].replace(/&amp;/g, '&').trim()
                                };

                                if (await this.civilAndLienSaveToNewSchema(data)) {
                                    count += 1;
                                }
                            }
                        }
                        await this.sleep(200);
                        await page.goBack();
                        await this.sleep(2000);
                    }


                }
                const [nextPage] = await page.$x('//a[text()="Next"]');
                if (!!nextPage) {
                    await nextPage.click();
                    await page.waitFor(3000);
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
        let tryCount = 0;
        let countRecords = 0
        let tryFlag: boolean;
        try {
            do {
                tryFlag = false
                await page.waitForSelector('#middle_left');
                await page.click('input[type="submit"][value="Public Login"][name="submit"]');
                await page.waitForXPath('//input[@name="accept"]');
                await page.click('input[type="submit"][name="accept"]');
                const [searchTable] = await page.$x('//*[id="#searchTable"]');
                if (!searchTable) {
                    await page.reload();
                    tryFlag = true;
                }
            } while (tryCount == 4 || !!tryFlag)
        } catch (e) {
        }
        try {
            let dateRange = await this.getDateRange('Colorado', 'Pueblo');
            let date = dateRange.from;
            let today = dateRange.to;
            let days = Math.ceil((today.getTime() - date.getTime()) / (1000 * 3600 * 24)) - 1;
            for (let i = days < 0 ? 1 : days; i >= 0; i--) {
                try {
                    let dateSearch = new Date();
                    dateSearch.setDate(dateSearch.getDate() - i);
                    await page.goto('https://erecording.co.pueblo.co.us/recorder/eagleweb/docSearch.jsp');
                    await page.waitForSelector('#searchTable');
                    await page.evaluate(() => {
                        // @ts-ignore
                        document.querySelector('#RecDateIDStart').value = '';
                        // @ts-ignore
                        document.querySelector('#RecDateIDEnd').value = '';
                    })
                    await page.type('#RecDateIDStart', dateSearch.toLocaleDateString('en-US'), { delay: 100 });
                    await page.type('#RecDateIDEnd', dateSearch.toLocaleDateString('en-US'), { delay: 100 });
                    await page.click('input[type="submit"][value="Search"][class="search"]');
                    const count = await this.getData(page);
                    countRecords += count;
                    console.log(`${dateSearch.toLocaleDateString('en-US')} found ${count} records.`);
                } catch (e) {
                }
            }
        } catch (e) {
            console.log(e)
            console.log('Error search');
            await AbstractProducer.sendMessage('Pueblo', 'Colorado', countRecords, 'Civil & Lien');
            return false
        }
        console.log(countRecords)
        await AbstractProducer.sendMessage('Pueblo', 'Colorado', countRecords, 'Civil & Lien');

        return true;
    }
}

