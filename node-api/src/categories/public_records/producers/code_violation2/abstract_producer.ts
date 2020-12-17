import puppeteer from 'puppeteer';
import { S3 } from 'aws-sdk';

import { IPublicRecordProducer } from '../../../../models/public_record_producer';
import db, { PublicRecordOwner, PublicRecordOwnerProductProperty, PublicRecordProperty } from '../../../../models/db';
// config
import { config as CONFIG } from '../../../../config';
import { IConfigEnv } from '../../../../iconfig';
const config: IConfigEnv = CONFIG[process.env.NODE_ENV || 'production'];

import SnsService from '../../../../services/sns_service';
import axios from 'axios';

export default abstract class AbstractProducer {
    browser: puppeteer.Browser | undefined;
    browserPages = {
        generalInfoPage: undefined as undefined | puppeteer.Page
    };
    productId = '';
    stateToCrawl: string;
    publicRecordProducer: IPublicRecordProducer;
    stateAbbreviationArray = [
        ['arizona', 'az'],
        ['alabama', 'al'],
        ['alaska', 'ak'],
        ['arkansas', 'ar'],
        ['california', 'ca'],
        ['colorado', 'co'],
        ['connecticut', 'ct'],
        ['delaware', 'de'],
        ['florida', 'fl'],
        ['georgia', 'ga'],
        ['hawaii', 'hi'],
        ['idaho', 'id'],
        ['illinois', 'il'],
        ['indiana', 'in'],
        ['iowa', 'ia'],
        ['kansas', 'ks'],
        ['kentucky', 'ky'],
        ['louisiana', 'la'],
        ['maine', 'me'],
        ['maryland', 'md'],
        ['massachusetts', 'ma'],
        ['michigan', 'mi'],
        ['minnesota', 'mn'],
        ['mississippi', 'ms'],
        ['missouri', 'mo'],
        ['montana', 'mt'],
        ['nebraska', 'ne'],
        ['nevada', 'nv'],
        ['new-hampshire', 'nh'],
        ['new-jersey', 'nj'],
        ['new-mexico', 'nm'],
        ['new-york', 'ny'],
        ['north-carolina', 'nc'],
        ['north-dakota', 'nd'],
        ['ohio', 'oh'],
        ['oklahoma', 'ok'],
        ['oregon', 'or'],
        ['pennsylvania', 'pa'],
        ['rhode-island', 'ri'],
        ['south-carolina', 'sc'],
        ['south-dakota', 'sd'],
        ['tennessee', 'tn'],
        ['texas', 'tx'],
        ['utah', 'ut'],
        ['vermont', 'vt'],
        ['virginia', 'va'],
        ['washington', 'wa'],
        ['west-virginia', 'wv'],
        ['wisconsin', 'wi'],
        ['wyoming', 'wy'],
    ];

    abstract async init(): Promise<boolean>;
    abstract async read(): Promise<boolean>;
    abstract async parseAndSave(): Promise<boolean>;

    ///////////////////////////////////////////////////////////////////////
    // Send Notification   
    ///////////////////////////////////////////////////////////////////////
    static async sendMessage(county: string, state: string, countRecords: number, sourceType: string) {
        const snsService = new SnsService();
        let topicName = SnsService.CIVIL_TOPIC_NAME;
        if (! await snsService.exists(topicName)) {
            await snsService.create(topicName);
        }

        if (! await snsService.subscribersReady(topicName, SnsService.CIVIL_UPDATE_SUBSCRIBERS)) {
            await snsService.subscribeList(topicName);
        }
        await snsService.publish(topicName, `${county} county, ${state} total ${sourceType} data saved: ${countRecords}`);
    }

    constructor(publicRecordProducer: IPublicRecordProducer) {
        this.publicRecordProducer = publicRecordProducer;
        this.stateToCrawl = this.publicRecordProducer?.state || '';
    }

    async startParsing(finishScript?: Function) {
        try {
            // initiate pages
            let initialized = await this.init();
            if (initialized) {
                // check read
                console.log('Check newSource.read()', await this.read());
            } else {
                return false;
            }
            
            const practiceType = 'code-violation';
            const productName = `/${this.publicRecordProducer.state.toLowerCase()}/${this.publicRecordProducer.county}/${practiceType}`;
            this.productId = await db.models.Product.findOne({name: productName}).exec();
    
            // call parse and save
            let success = await this.parseAndSave();
            return success;
        } catch (error) {
            console.log(error);
            return false;
        } finally {
            //end the script and close the browser regardless of result
            await this.browser?.close();
            if (finishScript) finishScript();
        }
    }

    async launchBrowser(): Promise<puppeteer.Browser> {
        return await puppeteer.launch({
            headless: config.puppeteer_headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--enable-features=NetworkService' ],
            ignoreDefaultArgs: ['--disable-extensions'],
            ignoreHTTPSErrors: true,
            timeout: 60000
        });
    }

    async setParamsForPage(page: puppeteer.Page): Promise<void> {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.0 Safari/537.36');
        await page.setViewport({ height: 800, width: 1200 });
    }

    protected normalizeStringForMongo(sourceString: string) {
        return sourceString.toLocaleLowerCase().replace('_', '-').replace(/[^A-Z\d\s\-]/ig, '').replace(/\s+/g, '-');
    }
    protected getFormattedDate(date: Date) {
        let year = date.getFullYear();
        let month = (1 + date.getMonth()).toString().padStart(2, '0');
        let day = date.getDate().toString().padStart(2, '0');

        return month + '/' + day + '/' + year;
    }
    protected async getDateRange(state: string, county: string) {
        console.log('\n// =============== FETCHING DATE RANGE ===============')
        let normalizedState = this.normalizeStringForMongo(state);
        if(normalizedState.length > 2){
            for(let i = 0; i < this.stateAbbreviationArray.length; i++){
                if(this.stateAbbreviationArray[i][0] == normalizedState.trim()){
                    normalizedState = this.stateAbbreviationArray[i][1]; // e.g: florida to fl
                    break;
                }
            }
        }
        const normalizedCounty = this.normalizeStringForMongo(county);
        const categories = [
            'foreclosure',
            'preforeclosure',
            'bankruptcy',
            'tax-lien',
            'auction',
            'inheritance',
            'probate',
            'eviction',
            'hoa-lien',
            'irs-lien',
            'mortgage-lien',
            'pre-inheritance',
            'pre-probate',
            'divorce',
            'tax-delinquency',
            'code-violation',
            'absentee-property-owner',
            'vacancy',
            'debt',
            'personal-injury',
            'marriage',
            'other-civil'
        ];
        let productNamesArray = [];
        for (let category of categories) {
            let normalizedCategory = this.normalizeStringForMongo(category);
            let productName = `/${normalizedState}/${normalizedCounty}/${normalizedCategory}`;
            productNamesArray.push(productName);
        }
        let queryResultsArray = await db.models.Product.find({ name: { $in: productNamesArray } }).exec();
        let productIdsArray = [];
        for (let productDoc of queryResultsArray) {
            productIdsArray.push(productDoc._id);
        }

        const lastItemDB: any = await db.models.OwnerProductProperty.aggregate( [ 
            { 
                $match: {
                    fillingDate: { "$exists": true, "$ne": null },
                    productId: { $in: productIdsArray }
                }
            },
            { 
                $project: {
                    fillingDate: {
                    $dateFromString: {
                        dateString: '$fillingDate'
                    }
                }
            }
         }, { $sort: { fillingDate : -1} }, {$limit: 1} ] );
         const lastfillingDate = lastItemDB && lastItemDB.length > 0 ? lastItemDB[0].fillingDate : null;

        // const lastItemDB = await db.models.OwnerProductProperty.findOne({
        //     fillingDate: { "$exists": true, "$ne": null },
        //     productId: { $in: productIdsArray }
        // }, null, { sort: { fillingDate: -1 } }); // check last item from DB

        let fromDate;
        if (lastfillingDate) {
            fromDate = new Date(lastfillingDate);
            if (isNaN(fromDate.getTime())) {
                fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - 30);
            } else {
                fromDate.setDate(fromDate.getDate() - 1);
            }
        } else {
            fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 30);
        }
        let toDate = new Date();

        console.log('start date : ' + this.getFormattedDate(fromDate));
        console.log('end date : ' + this.getFormattedDate(toDate));
        console.log('\n');

        return {from: fromDate, to: toDate};
    }
    protected async getTextContent(elemHandle: puppeteer.ElementHandle[]): Promise<string> {
        let retStr = '';

        if (elemHandle.length) {
            for (let singleElemHandle of elemHandle) {
                retStr += (await singleElemHandle.evaluate(elem => elem.textContent))?.trim() + ' ';
            }
            return retStr.trim();
        } else {
            return '';
        }
    }

    protected async getTextByXpathFromPage(page: puppeteer.Page, xPath: string) {
        const [elm] = await page.$x(xPath);
        if (elm == null) {
            return '';
        }
        let text = await page.evaluate(j => j.innerText, elm);
        return text.replace(/\n/g, ' ');
    }

    protected usingLocalDb(): boolean {
        if (config.database_uri.includes('localhost') || config.database_uri.includes('127.0.0.1') || config.database_uri.includes('mongodb://mongo:27017/')) {
            console.log('Using localDB, environment set to testing. Bucket will not be used.')
            return true;
        }
        return false;
    }

    private s3 = new S3({
        apiVersion: '2006-03-01',
        region: 'us-east-2'
    })

    protected getFileFromS3Bucket = async (identifierString: string) => {
        const s3bucket = 'scraper-json-data';
        const s3key = `producer-dependencies/${identifierString}`;

        const params = {
            'Bucket': s3bucket,
            'Key': s3key
        }

        return new Promise((resolve, reject) => {
            this.s3.getObject(params, (err: any, data: any) => {
                if (err) {
                    if (err.code === 'NoSuchKey') {
                        console.warn(`File not found: ${s3key}`);
                    } else {
                        console.warn(err);
                    }
                    resolve(false);
                } else {
                    resolve(data.Body);
                }
            })
        })
    }

    protected writeFileToS3Bucket = async (identifierString: string, stringifiedBody: string) => {
        const s3bucket = 'scraper-json-data';
        const s3key = `producer-dependencies/${identifierString}`;

        const params = {
            'Body': stringifiedBody,
            'Bucket': s3bucket,
            'Key': s3key
        }

        return new Promise((resolve, reject) => {
            this.s3.putObject(params, (err: any, data: any) => {
                if (err) {
                    console.warn(err);
                    resolve(false);
                } else {
                    resolve(true);
                }
            })
        })
    }

    protected enqueueAddresses = async (countyPropsObj: any) => {
        for (let county of Object.keys(countyPropsObj)) {
            console.log(`County: ${county}`);

            for (let propertyAddressObj of countyPropsObj[county]) {
                // Add propertyAddressObj to queue collection in mongo here
                console.log(`   - ${JSON.stringify(propertyAddressObj)}`)
            }
            // Produce message in SQS queue here
        }
    }

    protected getPracticeType(docType: string) {
        let practiceType = 'debt';
        if (docType.match(/foreclosure/i) || docType.match(/pendens/i) || docType.match(/lis.*p/i)) {
            practiceType = 'preforeclosure';
        } else if (docType.match(/eviction/i) || docType.match(/rent/i) || docType.match(/tenant/i) || docType.match(/landlord/i) || docType.match(/lease/i) || docType.match(/termination/i)) {
            practiceType = 'eviction';
        } else if (docType.match(/inheritance/i) || docType.match(/deed/i)) {
            practiceType = 'inheritance';
        } else if (docType.match(/probate/i)) {
            practiceType = 'probate';
        } else if (docType.match(/lien/i)) {
            if (docType.match(/hoa/i)){
                practiceType = 'hoa-lien';
            } else if (docType.match(/irs/i)){
                practiceType = 'irs-lien';
            } else if (docType.match(/mortgage/i)){
                practiceType = 'mortgage-lien';
            } else if (docType.match(/tax/i)){
                practiceType = 'tax-lien';
            } else {
                practiceType = 'enforce-lien'
            }
        } else if (docType.match(/pre.*inheritance/i)) {
            practiceType = 'pre-inheritance';
        } else if (docType.match(/pre.*probate/i)) {
            practiceType = 'pre-probate';
        } else if (docType.match(/divorce/i)) {
            practiceType = 'divorce';
        } else if (docType.match(/tax.*delinquency/i)) {
            practiceType = 'tax-delinquency';
        } else if (docType.match(/code.*violation/i) || docType.match(/violation/i) || docType.match(/property.*issue/i) || docType.match(/code.*enforcement/i) || docType.match(/city.*violation/i) || docType.match(/compliance/i)) {
            practiceType = 'code-violation';
        } else if (docType.match(/marriage/i) || docType.match(/RELEASE MARITAL CLAIMS/i)) {
            practiceType = 'marriage';
        } else if (docType.match(/injury/i)) {
            practiceType = 'personal-injury';
        } else if (docType.match(/debt/i)) {
            practiceType = 'debt';
        } else if (docType.match(/bankruptcy/i)){
            practiceType = 'bankruptcy';
        } else if (docType.match(/auction/i)){
            practiceType = 'auction';
        } else if (docType.match(/mortgage/i) || docType.match(/loan.*modification/i)){
            practiceType = 'mortgage-lien';
        } else if (docType.match(/easement/i)){
            practiceType = 'absentee-property-owner';
        } else if (docType.match(/child.*support/i) || docType.match(/clean.*green/i)){
            practiceType = 'other-civil';
        }
        return practiceType;
    }


    async openPage(page: puppeteer.Page, link: string, xpath: string) {
        let retries = 0;
        while (retries < 15) {
            try {
                console.log(link);
                await page.goto(link, {waitUntil: 'load'});
                await page.waitForXPath(xpath);
                return true;
            } catch (error) {
                console.log(error);
                retries++;
                console.log(`Site loading was failed, retrying now... [${retries}]`);
            }
        }
        return false;
    }

    //////////// PARSE NAME METHODS & VARIABLES ////////////////
    companyIdentifiersArray = [
        'GENERAL', 'TRUSTEES', 'INC', 'ORGANIZATION',
        'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED',
        'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY',
        'PARTNERSHIP', 'CHURCH', 'CITY', 'SECRETARY',
        'DEVELOPMENT', 'INVESTMENT', 'ESTATE', 'LLP', 'LP', 'HOLDINGS',
        'LOAN', 'CONDOMINIUM', 'CATHOLIC', 'INVESTMENTS', 'D/B/A', 'COCA COLA',
        'LTD', 'CLINIC', 'TODAY', 'PAY', 'CLEANING', 'COSMETIC', 'CLEANERS',
        'FURNITURE', 'DECOR', 'FRIDAY HOMES', 'MIDLAND', 'SAVINGS', 'PROPERTY',
        'ASSET', 'PROTECTION', 'SERVICES', 'TRS', 'ET AL', 'L L C', 'NATIONAL',
        'ASSOCIATION', 'MANAGMENT', 'PARAGON', 'MORTGAGE', 'CHOICE', 'PROPERTIES',
        'J T C', 'RESIDENTIAL', 'OPPORTUNITIES', 'FUND', 'LEGACY', 'SERIES',
        'HOMES', 'LOAN', 'FAM', 'PRAYER', 'WORKFORCE', 'HOMEOWNER', 'L P', 'UNION',
        'DEPARTMENT', 'LOANTRUST', 'OPT2', 'COMMONWEALTH', 'PENNSYLVANIA', 'UNIT', 
        'KEYBANK', 'LENDING', 'FUNDING', 'AMERICAN', 'COUNTY', 'AUTHORITY', 
        'LENDING', 'FCU', 'TOWNSHIP', 'SPECTRUM', 'CU', 'GATEWAY',
        'LOANS', 'MERS', 'SPECTRUM', 'CU', 'BK', 'UN', 'PA', 'DOLLAR', 'ASSN', 'MTG', 'REVOLUTION', 'NATL',
        'BUSINESS', 'CREDIT', 'COMMUNITY'
    ];
    suffixNamesArray = ['I', 'II', 'III', 'IV', 'V', 'ESQ', 'JR', 'SR'];
    removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'TR', 'TRUSTEE', 'TRUST'];

    // main method that will used in any producer.
    protected newParseName(name: string){
        name = name.trim();
        name = name.replace(/\s+/g,' ');
        let result;
        const companyRegexString = `\\b(?:${this.companyIdentifiersArray.join('|')})\\b`;
        const companyRegex = new RegExp(companyRegexString, 'i');
        const removeFromNameRegexString = `^(.*?)\\b(?:${this.removeFromNamesArray.join('|')})\\b.*?$`;
        const removeFromNamesRegex = new RegExp(removeFromNameRegexString, 'i');

        // check if the name is company
        if (name.match(companyRegex)) {
            result = {
                type: name.match(/(LLC)|(L L C)/i) ? 'LLC' : 'COMPANY',
                firstName: '',
                lastName: '',
                middleName: '',
                fullName: name.trim(),
                suffix: ''
            };
            return result;
        }

        // remove anything inside removeFromNamesArray because it's not company and it's a person.
        let cleanName = name.match(removeFromNamesRegex);
        if (cleanName) {
            name = cleanName[1];
        }

        // check if the name is contains comma or not
        if(name.match(/,/g)){
            result = this.parseNameWithComma(name);
        } else {
            result = this.parseNameWithoutComma(name);
        }
        return result;
    }

    // e.g WILSON, JACK W
    protected parseNameWithComma(name: string){
        let result;
        const suffixNamesRegex = new RegExp(`\\b(?:${this.suffixNamesArray.join('|')})\\b`, 'i');

        try {
            const suffix = name.match(suffixNamesRegex);
            name = name.replace(suffixNamesRegex, '');
            name = name.replace(/  +/g, ' ');
            let ownersNameSplited = name.split(',');
            const defaultLastName = ownersNameSplited[0].trim();
            let firstNameParser = ownersNameSplited[1].trim().split(/\s+/g);
            const firstName = firstNameParser[0].trim();
            firstNameParser.shift();
            const middleName = firstNameParser.join(' ');
            const fullName = `${defaultLastName}, ${firstName} ${middleName} ${suffix ? suffix[0] : ''}`;
            result = {
                firstName,
                lastName: defaultLastName,
                middleName,
                fullName: fullName.trim(),
                suffix: suffix ? suffix[0] : ''
            };
        }
        catch (e) {

        }
        if (!result) {
            result = {
                firstName: '',
                lastName: '',
                middleName: '',
                fullName: name.trim(),
                suffix: ''
            };
        }
        return result;
    }

    // e.g WILSON JACK W
    protected parseNameWithoutComma(name: string){
        let result;

        const suffixNamesRegex = new RegExp(`\\b(?:${this.suffixNamesArray.join('|')})\\b`, 'i');
        const suffix = name.match(suffixNamesRegex);
        name = name.replace(suffixNamesRegex, '');
        name = name.replace(/  +/g, ' ');
        let ownersNameSplited: any = name.split(' ');
        const defaultLastName = ownersNameSplited[0].trim();
        ownersNameSplited.shift();
        try {
            const firstName = ownersNameSplited[0].trim();
            ownersNameSplited.shift();
            const middleName = ownersNameSplited.join(' ');
            const fullName = `${defaultLastName}, ${firstName} ${middleName} ${suffix ? suffix[0] : ''}`;
            result = {
                firstName,
                lastName: defaultLastName,
                middleName,
                fullName: fullName.trim(),
                suffix: suffix ? suffix[0] : ''
            }
        } catch (e) {
        }
        if (!result) {
            result = {
                firstName: '',
                lastName: '',
                middleName: '',
                fullName: name.trim(),
                suffix: ''
            };
        }
        return result;
    }

    // Example of the data:
    // const Data = {
    //   "Property Address": propertyAddress.trim(),
    //   "Property City": propertyCity.trim(),
    //   "Property State": "FL",
    //   "Property Zip": propertyZip.trim(),
    //   "First Name": firstName,
    //   "Last Name": lastName.replace(",","").trim(),
    //   "Middle Name": middleName,
    //   "Name Suffix": suffixName,
    //   "Full Name": fullName.trim(),
    //   "County": "Hillsborough",
    //   "practiceType": practiceType,
    //   "propertyAppraiserProcessed": false,
    //   "vacancyProcessed": false,
    //   "fillingDate": civilDataFillingDate,
    //   "productId": prod._id
    // }
    async civilAndLienSaveToNewSchema(data: any){
        // If the data has full name and property address
        console.log('\n// =============== NEW PUBLIC RECORD ===============');
        try{
            let owner_id = null;
            let property_id = null;
            let product_id = data['productId'];
            let propertyAppraiserProcessed = false;
            const exceptionNames = ['bank of america', this.normalizeStringForMongo(data['County']), 'state of', 'wells fargo', 'insurance', 'geico'];

            console.log('///// OWNER');
            if (data['Full Name']) {
                const exceptionNamesString = `\\b(?:${exceptionNames.join('|')})\\b`;
                const exceptionNamesRegex = new RegExp(exceptionNamesString, 'i');
                if(data['Full Name'].match(exceptionNamesRegex)){
                    console.log('Name is identified as a bussiness!');
                } else {
                    let owner = await db.models.Owner.findOne({ 'Full Name': data['Full Name'], 'County': this.normalizeStringForMongo(data['County']), 'Property State': data['Property State'] });
                    if (!owner) {
                        let dataForOwner = {
                            'Full Name': data['Full Name'].trim(),
                            'County': this.normalizeStringForMongo(data['County'].trim()),
                            'Property State': data['Property State'].trim(),
                            'First Name': (data['First Name'] || '').trim(),
                            'Last Name': (data['Last Name'] || '').trim(),
                            'Middle Name': (data['Middle Name'] || '').trim(),
                            'Name Suffix': (data['Name Suffix'] || '').trim(),
                            'Mailing Care of Name': (data['Mailing Care of Name'] || '').trim(),
                            'Mailing Address': (data['Mailing Address'] || '').trim(),
                            'Mailing Unit #': (data['Mailing Unit #'] || '').trim(),
                            'Mailing City': (data['Mailing City'] || '').trim(),
                            'Mailing State': (data['Mailing State'] || '').trim(),
                            'Mailing Zip': (data['Mailing Zip'] || '').trim(),
                            'caseUniqueId': (data['caseUniqueId'] || '').trim(),
                        };
                        owner = new PublicRecordOwner(dataForOwner);
                        await owner.save();
                        console.log('--- NEW');
                    } else {
                        owner['Mailing Care of Name'] = (data['Mailing Care of Name'] || '').trim();
                        owner['Mailing Address'] = (data['Mailing Address'] || '').trim();
                        owner['Mailing Unit #'] = (data['Mailing Unit #'] || '').trim();
                        owner['Mailing City'] = (data['Mailing City'] || '').trim();
                        owner['Mailing State'] = (data['Mailing State'] || '').trim();
                        owner['Mailing Zip'] = (data['Mailing Zip'] || '').trim();
                        owner['caseUniqueId'] = (data['caseUniqueId'] || '').trim();
                        await owner.save();
                        console.log('--- OLD');
                    }
                    owner_id = owner._id;
                    console.log(owner);
                }
            }
            console.log('///// PROPERTY');
            if (data['Property Address']) {
                let property = await db.models.Property.findOne({ 'Property Address': data['Property Address'], 'County': this.normalizeStringForMongo(data['County']), 'Property State': data['Property State'] });
                if(!property){
                    let dataForProperty = {
                        'Property Address': data['Property Address'].trim(),
                        'Property Unit #': (data['Property Unit #'] || '').trim(),
                        'Property City': (data['Property City'] || '').trim(),
                        'Property State': (data['Property State'] || '').trim(),
                        'Property Zip': (data['Property Zip'] || '').trim(),
                        'County': this.normalizeStringForMongo((data['County'] || '').trim()),
                        fillingDate: (data.fillingDate || '').trim(),
                        vacancyProcessed: false
                    }
                    property = new PublicRecordProperty(dataForProperty);
                    await property.save();
                    console.log('--- NEW');
                } else {
                    console.log('--- OLD');
                }
                property_id = property._id;
                console.log(property);
            }
            console.log('///// OWNER_PRODUCT_PROPERTY')
            if (owner_id === null && property_id === null) {
                return false;
            }
            else {
                let isNew = true;
                let ownerProductProperty = await db.models.OwnerProductProperty.findOne({ ownerId: owner_id, propertyId: property_id, productId: product_id });
                if (!ownerProductProperty) {
                    let dataForOwnerProductProperty = {
                        ownerId: owner_id,
                        propertyId: property_id,
                        productId: product_id,
                        propertyAppraiserProcessed,
                        fillingDate: data.fillingDate,
                        originalDocType: data.originalDocType,
                        codeViolationId: (data.codeViolationId || '').trim()
                    }
                    ownerProductProperty = new PublicRecordOwnerProductProperty(dataForOwnerProductProperty);
                    await ownerProductProperty.save();
                    console.log('--- NEW');
                } else {
                    isNew = false;
                    ownerProductProperty.originalDocType = data.originalDocType;
                    ownerProductProperty.fillingDate = data.fillingDate;
                    ownerProductProperty.codeViolationId = (data.codeViolationId || '').trim();
                    await ownerProductProperty.save();
                    console.log('--- OLD');
                }
                console.log(ownerProductProperty);
                console.log('================================================= //');
                return isNew;
            }
        } catch (error){
            // pass duplicates or error data
            console.log(error)
            console.log('^^^ duplicate')
            return false;
        }
    }

    // get data from code violation api
    async getCodeViolationData(url: string, limit: number, offset: number) {
        console.log(`Fetching for URL: ${url}, LIMIT: ${limit}, OFFSET: ${offset}`);
        const symbol = url.match(/.json$/) ? '?' : '&';
        const response = await axios.get(`${url}${symbol}$limit=${limit}&$offset=${offset}`);
        if (response.status === 200) {
            const {data} = response;
            return {
                success: true,
                end: data.length < limit,
                data
            }
        }
        else {
            return {
                success: false
            }
        }
    }

    async getOffset(cnt_apis: number) {
        let offsets: any = '';
        if (this.publicRecordProducer.offset === '') {
            offsets = [];
            for (let i = 0 ; i < cnt_apis ; i++)
                offsets.push(0);
            offsets = offsets.join(' | ');
            this.publicRecordProducer.offset = offsets;
            await this.publicRecordProducer.save();
        }
        return this.publicRecordProducer.offset.split(' | ').map((of:string) => parseInt(of));
    }

    async updateOffset(offsets: number[]) {
        let offsets_ = offsets.join(' | ');
        this.publicRecordProducer.offset = offsets_;
        await this.publicRecordProducer.save();
    }

    ////// get random sleep in one minute //////
    getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min) ) + min;
    }
    async sleep(ms: number){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    protected async randomSleepInOneMinute(){
        let randInt = this.getRandomInt(10000,60000);
        console.log("Sleeping with", randInt, "ms...");
        await this.sleep(randInt);
    }
    protected async randomSleepIn5Sec(){
        let randInt = this.getRandomInt(1000,5000);
        console.log("Sleeping with", randInt, "ms...");
        await this.sleep(randInt);
    }
}