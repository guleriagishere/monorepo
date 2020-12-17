import puppeteer from 'puppeteer';
import db, { PublicRecordLineItem, PublicRecordOwner, PublicRecordOwnerProductProperty, PublicRecordProperty } from '../../../../models/db';
import { IOwnerProductProperty } from '../../../../models/owner_product_property';
import { Document } from 'mongoose';
import axios from 'axios';
import { sleep } from '../../../../core/sleepable';

// config
import { config as CONFIG } from '../../../../config';
import { IConfigEnv } from '../../../../iconfig';
import { IPublicRecordAttributes } from '../../../../models/public_record_attributes';
const config: IConfigEnv = CONFIG[process.env.NODE_ENV || 'production'];

export default abstract class AbstractPAConsumer {
    browser: puppeteer.Browser | undefined;
    browserPages = {
        propertyAppraiserPage: undefined as undefined | puppeteer.Page
    };
    abstract readDocsToParse(): IOwnerProductProperty[];
    abstract async init(): Promise<boolean>;
    abstract async read(): Promise<boolean>;
    abstract async parseAndSave(docsToParse: IOwnerProductProperty[]): Promise<boolean>;

    searchBy: string = 'address';
    
    async startParsing(finishScript?: Function) {
        try {
            // read documents from mongo
            const docsToParse = this.readDocsToParse();
            let docsAtStart = docsToParse.length;
            if (!docsToParse.length) {
                console.log('No documents to parse in DB.');
                return true;
            }
            // initiate pages
            let initialized = await this.init();
            if (initialized) {
                // check read
                console.log('Checking PA site status: ', await this.read());
            } else {
                return false;
            }
            // call parse and save
            let success = await this.parseAndSave(docsToParse);

            let docsAtEnd = (await this.readDocsToParse()).length;
            let percentageDiff = ((docsAtStart - docsAtEnd)/docsAtStart).toFixed(2);
            console.log('Script is finished!');
            // console.log(`Script success rate: ${percentageDiff}%`); // deleted because that's counted by line items data.

            // await this.formatRecordingDates();
            
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
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            ignoreDefaultArgs: ['--disable-extensions'],
            ignoreHTTPSErrors: true
        });
    }

    async setParamsForPage(page: puppeteer.Page): Promise<void> {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.0 Safari/537.36');
        await page.setViewport({ height: 800, width: 1200 });
    }

    protected normalizeStringForMongo(sourceString: string) {
        return sourceString.toLocaleLowerCase().replace('_', '-').replace(/[^A-Z\d\s\-]/ig, '').replace(/\s+/g, '-');
    }

    protected async getDocumentsArrayFromMongo(state: string, county: string, categories: string[]) {
        let productNamesArray = [];
        for (let category of categories) {
            let productName = `/${state}/${county}/${category}`;
            productNamesArray.push(productName);
        }
        let queryResultsArray = await db.models.Product.find({ name: { $in: productNamesArray } }).exec();
        let productIdsArray = [];
        for (let productDoc of queryResultsArray) {
            productIdsArray.push(productDoc._id);
        }
        let documentsArray = await db.models.OwnerProductProperty.find({
            productId: { $in: productIdsArray },
            propertyAppraiserProcessed: false
        }).populate('ownerId propertyId').exec();
        return documentsArray;
    }

    protected async cloneMongoDocument(initialDocument: Document) {
        const { _id, __v, createdAt, updatedAt, ...clonedDocumentObj } = initialDocument.toObject();
        if (clonedDocumentObj.hasOwnProperty('First Name')) {
            delete clonedDocumentObj["First Name"];
        }
        if (clonedDocumentObj.hasOwnProperty('Last Name')) {
            delete clonedDocumentObj["Last Name"];
        }
        if (clonedDocumentObj.hasOwnProperty('Middle Name')) {
            delete clonedDocumentObj["Middle Name"];
        }
        if (clonedDocumentObj.hasOwnProperty('Name Suffix')) {
            delete clonedDocumentObj["Name Suffix"];
        }
        if (clonedDocumentObj.hasOwnProperty('Full Name')) {
            delete clonedDocumentObj["Full Name"];
        }        
        const clonedDocument = new PublicRecordLineItem(clonedDocumentObj);
        return clonedDocument;
    }

    protected cloneDocument(document: any) {
        const initialDocument: any = {...document};
        if (initialDocument.hasOwnProperty('First Name')) {
            delete initialDocument["First Name"];
        }
        if (initialDocument.hasOwnProperty('Last Name')) {
            delete initialDocument["Last Name"];
        }
        if (initialDocument.hasOwnProperty('Middle Name')) {
            delete initialDocument["Middle Name"];
        }
        if (initialDocument.hasOwnProperty('Name Suffix')) {
            delete initialDocument["Name Suffix"];
        }
        if (initialDocument.hasOwnProperty('Full Name')) {
            delete initialDocument["Full Name"];
        }        
        return initialDocument;
    }

    protected cloneDocumentV2(document: any) {
        const initialDocument: any = {...document};
        if (initialDocument.owner.hasOwnProperty('First Name')) {
            delete initialDocument.owner["First Name"];
        }
        if (initialDocument.owner.hasOwnProperty('Last Name')) {
            delete initialDocument.owner["Last Name"];
        }
        if (initialDocument.owner.hasOwnProperty('Middle Name')) {
            delete initialDocument.owner["Middle Name"];
        }
        if (initialDocument.owner.hasOwnProperty('Name Suffix')) {
            delete initialDocument.owner["Name Suffix"];
        }
        if (initialDocument.owner.hasOwnProperty('Full Name')) {
            delete initialDocument.owner["Full Name"];
        }        
        return initialDocument;
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

    protected async getTextContentByXpathFromPage(page: puppeteer.Page, xPath: string) {
        const [elm] = await page.$x(xPath);
        if (elm == null) {
            return '';
        }
        let text = await page.evaluate(j => j.textContent, elm);
        return text.replace(/\n/g, ' ');
    }

    getNameInfo(document: any, separated_by: string = ' ') {
        const owner = document;
        let first_name = owner['First Name'] || '';
        first_name = first_name.replace(/[^\w|\s]|\s+/gs, ' ').trim();
        let last_name =  owner['Last Name'] || '';
        last_name = last_name.replace(/[^\w|\s]|\s+/gs, ' ').trim();
        let middle_name = owner['Middle Name'] || '';
        middle_name = middle_name.replace(/[^\w|\s]|\s+/gs, ' ').trim();
        let full_name = owner['Full Name'] || '';
        full_name = full_name.replace(/[^\w|\s]|\s+/gs, ' ').trim();
        let owner_name = full_name;
        let owner_name_regexp = '';
        
        if (first_name === '' && last_name === '')  {
            if (full_name !== '') {
                owner_name = full_name;
                last_name = full_name;
            }
        }
        else {
            owner_name = last_name + separated_by + ' ' + first_name;
        }
        owner_name = owner_name.replace(/\s+/g, ' ').trim();
        owner_name_regexp = `${owner_name.toUpperCase().split(' ').join(',?(\\s+)?(\\w+)?(\\s+)?')}|${owner_name.toUpperCase().split(' ').reverse().join(',?(\\s+)?(\\w+)?(\\s+)?')}`;
        
        return {
            first_name,
            last_name,
            middle_name,
            full_name,
            owner_name,
            owner_name_regexp
        }
    }

    async getLineItemObject(document: any) {
        const { _id, __v, createdAt, updatedAt, ..._document } = document.toJSON();
        let docToSave: any = {..._document['ownerId'], ..._document['propertyId'], productId: _document['productId']};
        // let owner = await PublicRecordOwner.findOne({'_id': _document['ownerId']}).exec();
        // let property = await PublicRecordProperty.findOne({'_id': _document['propertyId']}).exec();
        // let docToSave: any = { ...owner?.toJSON(), ...property?.toJSON(), productId: _document['productId']};
        // console.log(docToSave);
        if (docToSave.hasOwnProperty('_id'))
            delete docToSave['_id'];
        if (docToSave.hasOwnProperty('__v'))
            delete docToSave['__v'];
        if (docToSave.hasOwnProperty('createdAt'))
            delete docToSave['createdAt'];
        if (docToSave.hasOwnProperty('updatedAt'))
            delete docToSave['updatedAt'];
        return docToSave;
    }

    decideSearchByV2(ownerProductProperty: any) {
        // check if the document is already completed with landgrid
        if (ownerProductProperty.propertyId && ownerProductProperty.ownerId){ // both there
            // check if ownerproductproperty processed by landgrid and not failed
            if(ownerProductProperty.landgridPropertyAppraiserProcessed && !ownerProductProperty.reason_for_failed_pa && ownerProductProperty.propertyId['Last Sale Amount']){
                console.log("decideSearchByV2 detected completed document by Landgrid:",ownerProductProperty);
                return false;
            }
        }

        // check the document is searched by address or name
        if (ownerProductProperty.propertyId && ownerProductProperty.propertyId['Property Address']) {
            this.searchBy = 'address';
        }
        else {
            if (ownerProductProperty.ownerId && ownerProductProperty.ownerId['Full Name']) {
                this.searchBy = 'name';
            } else {
                console.log("decideSearchByV2 unexpected document: ",ownerProductProperty);
                console.log("Insufficient info for Owner and Property");
                return false;
            }
        }
        console.log("Processing:",ownerProductProperty);
        return true;
    }
    

    // This is method for saving the data in OwnerProductProperty from property appraisers, without modify the OwnerProductProperty.
    // It takes 2 argument
    // ownerProductProperty is the ownerProductProperty doc
    // dataFromPropertyAppraisers is the data from property appraisers
    async saveToOwnerProductPropertyV2(ownerProductProperty: any, dataFromPropertyAppraisers: any){
        let owner_id = null;
        let property_id = null;
        let product_id = ownerProductProperty.productId;
        try{
            console.log("=== SAVING TO OWNER PRODUCT PROPERTY V2 ===")
            if (this.searchBy === 'address'){ // Search by address
                console.log("=== SEARCHED BY ADDRESS ===");
                let oldOwner = await db.models.Owner.findOne({'Full Name': dataFromPropertyAppraisers['Full Name'], 'County': this.normalizeStringForMongo(dataFromPropertyAppraisers['County']), 'Property State': dataFromPropertyAppraisers['Property State']});
                if(oldOwner){
                    console.log("=== OLD OWNER:", oldOwner._id, "===");
                    ownerProductProperty.ownerId = oldOwner._id;
                    owner_id = oldOwner._id;
                } else {
                    console.log("=== CREATING NEW OWNER ===");
                    let dataForOwner = {
                        'Full Name': dataFromPropertyAppraisers['Full Name'],
                        'County': this.normalizeStringForMongo(dataFromPropertyAppraisers['County']),
                        'Property State': dataFromPropertyAppraisers['Property State'],
                        'First Name': dataFromPropertyAppraisers['First Name'] || '',
                        'Last Name': dataFromPropertyAppraisers['Last Name'] || '',
                        'Middle Name': dataFromPropertyAppraisers['Middle Name'] || '',
                        'Name Suffix': dataFromPropertyAppraisers['Name Suffix'] || '',
                        'Mailing Care of Name': dataFromPropertyAppraisers['Mailing Care of Name'] || '',
                        'Mailing Address': dataFromPropertyAppraisers['Mailing Address'] || '',
                        'Mailing Unit #': dataFromPropertyAppraisers['Mailing Unit #'] || '',
                        'Mailing City': dataFromPropertyAppraisers['Mailing City'] || '',
                        'Mailing State': dataFromPropertyAppraisers['Mailing State'] || '',
                        'Mailing Zip': dataFromPropertyAppraisers['Mailing Zip'] || ''
                    };
                    let newOwner = new PublicRecordOwner(dataForOwner);
                    await newOwner.save();
                    console.log("=== NEW OWNER:", newOwner._id, "===");
                    ownerProductProperty.ownerId = newOwner._id;
                    owner_id = newOwner._id;
                }
                let property = await db.models.Property.findOne({ _id: ownerProductProperty.propertyId });
                if(property['Last Sale Amount'] && property['Last Sale Amount'] != ''){
                    console.log("=== PROPERTY:",property._id,"ALREADY COMPLETED ===");
                } else {
                    console.log("=== UPDATING PROPERTY:",property._id,"===");
                    property['Owner Occupied'] = dataFromPropertyAppraisers['Owner Occupied'] || false;
                    property['Property Type'] = dataFromPropertyAppraisers['Property Type'] || '';
                    property['Total Assessed Value'] = dataFromPropertyAppraisers['Total Assessed Value'] || '';
                    property['Last Sale Recording Date'] = dataFromPropertyAppraisers['Last Sale Recording Date'] || '';
                    property['Last Sale Amount'] = dataFromPropertyAppraisers['Last Sale Amount'] || '';
                    property['Est. Remaining balance of Open Loans'] = dataFromPropertyAppraisers['Est. Remaining balance of Open Loans'] || '';
                    property['Est Value'] = dataFromPropertyAppraisers['Est Value'] || '';
                    property['Effective Year Built'] = dataFromPropertyAppraisers['Effective Year Built'] || '';
                    property['Est Equity'] = dataFromPropertyAppraisers['Est Equity'] || '';
                    property['Lien Amount'] = dataFromPropertyAppraisers['Lien Amount'] || '';
                    await property.save();
                }
                property_id = property._id;
            } else { // Search by name
                console.log("=== SEARCHED BY NAME ===");
                let oldProperty = await db.models.Property.findOne({'Property Address': dataFromPropertyAppraisers['Property Address'], 'County': this.normalizeStringForMongo(dataFromPropertyAppraisers['County']), 'Property State': dataFromPropertyAppraisers['Property State']});
                if(oldProperty){
                    console.log("=== OLD PROPERTY:", oldProperty._id, "===");
                    ownerProductProperty.propertyId = oldProperty._id;
                    property_id = oldProperty._id;
                } else {
                    console.log("=== CREATING NEW PROPERTY ===");
                    let dataForProperty = {
                        'Property Address': dataFromPropertyAppraisers['Property Address'],
                        'County': this.normalizeStringForMongo(dataFromPropertyAppraisers['County']),
                        'Property Unit #': dataFromPropertyAppraisers['Property Unit #'] || '',
                        'Property City': dataFromPropertyAppraisers['Property City'] || '',
                        'Property State': dataFromPropertyAppraisers['Property State'] || '',
                        'Property Zip': dataFromPropertyAppraisers['Property Zip'] || '',
                        'Owner Occupied': dataFromPropertyAppraisers['Owner Occupied'] || false,
                        'Property Type': dataFromPropertyAppraisers['Property Type'] || '',
                        'Total Assessed Value': dataFromPropertyAppraisers['Total Assessed Value'] || '',
                        'Last Sale Recording Date': dataFromPropertyAppraisers['Last Sale Recording Date'] || '',
                        'Last Sale Amount': dataFromPropertyAppraisers['Last Sale Amount'] || '',
                        'Est. Remaining balance of Open Loans': dataFromPropertyAppraisers['Est. Remaining balance of Open Loans'] || '',
                        'Est Value': dataFromPropertyAppraisers['Est Value'] || '',
                        'Effective Year Built': dataFromPropertyAppraisers['Effective Year Built'] || '',
                        'Est Equity': dataFromPropertyAppraisers['Est Equity'] || '',
                        'Lien Amount': dataFromPropertyAppraisers['Lien Amount'] || '',
                        vacancyProcessed: false
                    }
                    let newProperty = new PublicRecordProperty(dataForProperty);
                    await newProperty.save();
                    console.log("=== NEW PROPERTY:", newProperty._id, "===");
                    ownerProductProperty.propertyId = newProperty._id;
                    property_id = newProperty._id;
                }
                let owner = await db.models.Owner.findOne({ _id: ownerProductProperty.ownerId });
                if(owner['Mailing Address'] && owner['Mailing Address'] != ''){ // to avoid overwrite
                    console.log("=== OWNER:",owner._id,"ALREADY COMPLETED ===");
                } else {
                    console.log("=== UPDATING OWNER:",owner._id,"===");
                    owner['Mailing Care of Name'] = dataFromPropertyAppraisers['Mailing Care of Name'] || '';
                    owner['Mailing Address'] = dataFromPropertyAppraisers['Mailing Address'] || '',
                    owner['Mailing Unit #'] = dataFromPropertyAppraisers['Mailing Unit #'] || '',
                    owner['Mailing City'] = dataFromPropertyAppraisers['Mailing City'] || '',
                    owner['Mailing State'] = dataFromPropertyAppraisers['Mailing State'] || '',
                    owner['Mailing Zip'] = dataFromPropertyAppraisers['Mailing Zip'] || '',
                    await owner.save();
                }
                owner_id = owner._id;
            }

            let opp = await db.models.OwnerProductProperty.findOne({ ownerId: owner_id, propertyId: property_id, productId: product_id });
            if(!opp){
                let currentOpp = await db.models.OwnerProductProperty.findOne({ _id: ownerProductProperty._id });
                if(!currentOpp.ownerId || !currentOpp.propertyId ){ // if the current OPP is not completed
                    ownerProductProperty.propertyAppraiserProcessed = true;
                    await ownerProductProperty.save();
                    console.log(ownerProductProperty);
                    console.log("=== DONE SAVED TO OLD OWNER PRODUCT PROPERTY V2 ===");
                    return true;
                } else {
                    let dataForNewOpp = {
                        ownerId: owner_id,
                        propertyId: property_id,
                        productId: product_id,
                        propertyAppraiserProcessed: true,
                    }
                    let newOpp = new PublicRecordOwnerProductProperty(dataForNewOpp);
                    await newOpp.save();
                    console.log(newOpp);
                    console.log("=== DONE SAVED TO NEW OWNER PRODUCT PROPERTY V2 ===");
                    return true;
                }
            } else {
                console.log("=== DUPLICATE, ABORT SAVING TO OWNER PRODUCT PROPERTY V2 ===");
                return false;
            }
        } catch (error){
            console.log(error);
            console.log('Data duplicate or invalid!');
            return false;
        }
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
    protected async randomSleepInOneSec(){
        let randInt = this.getRandomInt(500,1000);
        console.log("Sleeping with", randInt, "ms...");
        await this.sleep(randInt);
    }
}