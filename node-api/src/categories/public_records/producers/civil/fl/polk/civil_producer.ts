import AbstractProducer from "../../../abstract_producer";
import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';
import puppeteer from "puppeteer";
import db from "../../../../../../models/db";
const JSEncrypt = require('node-jsencrypt');
import axios from 'axios';

const removeRowArray = [
    'CITY', 'DEPT', 'CTY', 'UNITED STATES', 'BANK', 'FIA CARD SERVICES NA',
    'FLORIDA PACE FUNDING AGENCY', 'COUNTY', 'CREDIT', 'HOSPITAL', 'FUNDING', 'UNIVERSITY',
    'MEDICAL', 'CONDOMINIUM ASSOCIATION', 'LOTS', 'TEXAS STATE', 'VETERANS', 'SECRETARY', 'DEPARTMENT',
    'INDIVIDUAL', 'INDIVIDUALLY', 'FINANCE', 'CITIBANK', 'MERS', 'STATE TAX COMMISSION'
];
const removeRowRegex = new RegExp(`\\b(?:${removeRowArray.join('|')})\\b`, 'i');

export default class CivilProducer extends AbstractProducer {
    urls = {
        generalInfoPage: 'https://apps.polkcountyclerk.net/browserviewor/'
    }

    xpaths = {
        isPageLoaded: '//a[text()="Document Type"]'
    }
    
    constructor(publicRecordProducer: IPublicRecordProducer) {
        // @ts-ignore
        super();
        this.publicRecordProducer = publicRecordProducer;
        this.stateToCrawl = this.publicRecordProducer?.state || '';
    }

    async init(): Promise<boolean> {
        console.log("running init")
        this.browser = await this.launchBrowser();
        this.browserPages.generalInfoPage = await this.browser.newPage();

        await this.setParamsForPage(this.browserPages.generalInfoPage);

        try {
            await this.browserPages.generalInfoPage.setDefaultTimeout(60000);
            await this.browserPages.generalInfoPage.goto(this.urls.generalInfoPage, {
                waitUntil: "load"
            });
            return true;
        } catch (err) {
            console.log("error loading page")
            console.warn(err);
            return false;
        }
    }

    async read(): Promise<boolean> {
        try {
            await this.browserPages.generalInfoPage?.waitForXPath(this.xpaths.isPageLoaded);
            console.warn('Page Loaded')
            return true;
        } catch (err) {
            console.warn("Problem loading property appraiser page.");
            return false;
        }
    }


    async getData(page: puppeteer.Page, date: any, name: any, docType: any): Promise<any> {
        if (removeRowRegex.test(name)) return false;
        const parseName: any = this.newParseName(name.trim())
        if (parseName?.type && parseName?.type == 'COMPANY') return false;
        let practiceType = this.getPracticeType(docType)

        const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
        console.log(productName);
        const prod = await db.models.Product.findOne({name: productName}).exec();
        const data = {
            'Property State': 'FL',
            'County': 'polk',
            'First Name': parseName.firstName,
            'Last Name': parseName.lastName,
            'Middle Name': parseName.middleName,
            'Name Suffix': parseName.suffix,
            'Full Name': parseName.fullName,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            fillingDate: date,
            productId: prod._id,
            originalDocType: docType
        };

        return await this.civilAndLienSaveToNewSchema(data);

    }

    getFormattedDate(date: Date) {
        let year = date.getFullYear();
        let month = (1 + date.getMonth()).toString().padStart(2, '0');
        let day = date.getDate().toString().padStart(2, '0');

        return year+month+day;
    }

    async parseAndSave(): Promise<boolean> {
        const page = this.browserPages.generalInfoPage;
        let countRecords = 0;
        let dateRange = await this.getDateRange('Arizona', 'polk');
        let fromDate = dateRange.from;
        let toDate = dateRange.to;

        // CHECK PUBLIC KEY FROM https://prnt.sc/vm74nb
        const publicKey =
        "-----BEGIN PUBLIC KEY-----" +
        "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXBPCKXRqaD74rYrPXU/DA4Z5H" +
        "mJbNivwCYijae6QXu/QLqS3GbyGrxkrEmdODbYWOLJfWBvaQSALcolSyKQUvtkjz" +
        "g61bJC2/xNk4HTHFrA4uAMMvC+49RlSgtEm5dI10+YOp0TGId1d4E0Ey0RDQxNWa" +
        "ev2TeleyipADuctnqwIDAQAB" +
        "-----END PUBLIC KEY-----";
        const encrypt = new JSEncrypt();
        encrypt.setPublicKey(publicKey);

        // console.log(page, 'this is page')
        if (page === undefined) return false;
        await page.setDefaultTimeout(60000);

        try {
            let doctypes: any = {};
            await page.waitForXPath('//a[text()="Document Type"]')
            const [document_type] = await page.$x('//a[text()="Document Type"]');
            await document_type.click();
            await page.waitFor(1000);

            const doctype_rows = await page.$x('//form[@name="docSearchForm"]//tr[contains(@ng-repeat, "docType")]');
            for (const dtrow of doctype_rows) {
                const doctype = await page.evaluate(el => ({key: el.children[1].textContent.trim(), label: el.children[2].textContent.trim()}), dtrow);
                doctypes[doctype.key] = doctype.label;
            }
                
            let days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24)) - 1;
            for (let i = days < 1 ? 1 : days ; i >= 0 ; i--) {
                let dateSearch = new Date();
                dateSearch.setDate(dateSearch.getDate() - i);
                const dateString = this.getFormattedDate(dateSearch);
                const keys = Object.keys(doctypes);
                while (keys.length > 0) {
                    const somekeys = keys.splice(0, 10);
                    const DocTypes = encrypt.encrypt(somekeys.join(','));
                    const FromDate = encrypt.encrypt(dateString);
                    const ToDate = encrypt.encrypt(dateString);
                    
                    const formData = {
                        DocTypes,
                        FromDate,
                        ToDate,
                        MaxRows: 0,
                        RowsPerPage: 0,
                        StartRow: 0
                    };
                    const resp = await axios.post('https://apps.polkcountyclerk.net/browserviewor/api/search', formData);
                    if (resp.status == 200) {
                        const respObj = resp.data;
                        if (respObj.length === 0) {
                            console.log('No results found');
                            continue;
                        }
                        console.log(respObj.length);
                        for (const data of respObj) {
                            const name = data.party_name;
                            const date = data.rec_date;
                            const doctype = doctypes[data.doc_type];
                            const saveRecord = await this.getData(page, date, name, doctype);
                            saveRecord && countRecords++;
                        }
                    } else {
                        console.log('Not found');
                    }
                    await this.randomSleepIn5Sec();
                }
            }

            await AbstractProducer.sendMessage('polk', 'Florida', countRecords, 'Civil');
            await page.close();
            await this.browser?.close();
            return true;
        } catch (error) {
            console.log(error);
            const errorImage = await this.uploadImageOnS3(page);
            await AbstractProducer.sendMessage('polk', 'Florida', countRecords, 'Civil', errorImage);
            return false;
        }
    }
}
