import puppeteer from 'puppeteer';
import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
const parser = require('parse-address');
const {parseFullName} = require('parse-full-name');

import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';
import { IOwnerProductProperty } from '../../../../../../models/owner_product_property';
import { IProperty } from '../../../../../../models/property';

export default class PAConsumer extends AbstractPAConsumer {
    publicRecordProducer: IPublicRecordProducer;
    ownerProductProperties: IOwnerProductProperty[];

    urls = {
        propertyAppraiserPage: 'https://www.pbcgov.org/papa/'
    }

    xpaths = {
        isPAloaded: '//input[@id="txtSearch"]'
    }

    constructor(publicRecordProducer: IPublicRecordProducer, ownerProductProperties: IOwnerProductProperty[]) {
        super();
        this.publicRecordProducer = publicRecordProducer;
        this.ownerProductProperties = ownerProductProperties;
    }

    readDocsToParse(): IOwnerProductProperty[] {
        return this.ownerProductProperties;
    }

    // use this to initialize the browser and go to a specific url.
    // setParamsForPage is needed (mainly for AWS), do not remove or modify it please.
    // return true when page is usable, false if an unexpected error is encountered.
    async init(): Promise<boolean> {
        this.browser = await this.launchBrowser();
        this.browserPages.propertyAppraiserPage = await this.browser.newPage();
        this.browserPages.propertyAppraiserPage.setDefaultTimeout(60000);
        this.browserPages.propertyAppraiserPage.setDefaultNavigationTimeout(60000)
        await this.setParamsForPage(this.browserPages.propertyAppraiserPage);
        try {
            await this.browserPages.propertyAppraiserPage.goto(this.urls.propertyAppraiserPage, { waitUntil: 'load' });
            return true;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    // use this as a middle layer between init() and parseAndSave().
    // this should check if the page is usable or if there was an error,
    // so use an xpath that is available when page is usable.
    // return true when it's usable, false if it errors out.
    async read(): Promise<boolean> {
        try {
            await this.browserPages.propertyAppraiserPage?.waitForXPath(this.xpaths.isPAloaded);
            return true;
        } catch (err) {
            console.warn('Problem loading property appraiser page.');
            return false;
        }
    }

    /**
     * convert address to required infos
     * @param document : IPublicRecordAttributes 
     *  full_address:  1527 N 23rd St, Lincoln, NE 68503
        street_name:   23rd St
        street_full:   1527 N 23rd St
        parsed
            number:     1527
            prefix:     N
            street:     23rd
            type:     St
            city:       Lincoln
            state:      NE
            zip:        68503
     */
    getAddress(document: IProperty): any {
        // 'Property Address': '162 DOUGLAS HILL RD',
        // 'Property City': 'WEST BALDWIN',
        // County: 'Cumberland',
        // 'Property State': 'ME',
        // 'Property Zip': '04091',
        const full_address = `${document['Property Address']}, ${document['Property City']}, ${document['Property State']} ${document['Property Zip']}`
        const parsed = parser.parseLocation(document['Property Address']);
        
        let street_name = parsed.street.trim();
        let street_full = document['Property Address'];
        let street_with_type = (parsed.number ? parsed.number : '') + ' ' + (parsed.prefix ? parsed.prefix : '') + ' ' + parsed.street + ' ' + (parsed.type ? parsed.type : '');
        street_with_type = street_with_type.trim();

        return {
            full_address,
            street_name,
            street_with_type,
            street_full,
            parsed
        }
    }

    /**
     * check if element exists
     * @param page 
     * @param selector 
     */
    async checkExistElement(page: puppeteer.Page, selector: string): Promise<Boolean> {
        const exist = await page.$(selector).then(res => res !== null);
        return exist;
    }

    /**
     * get textcontent from specified element
     * @param page 
     * @param root 
     * @param selector 
     */
    async getElementTextContent(page: puppeteer.Page, selector: string): Promise<string> {
        try {
            const existSel = await this.checkExistElement(page, selector);
            if (!existSel) return '';
            let content = await page.$eval(selector, el => el.textContent)
            return content ? content.trim() : '';
        } catch (error) {
            return '';
        }
    }
    /**
     * get innerHTML from specified element
     * @param page 
     * @param root 
     * @param selector 
     */
    async getElementHtmlContent(page: puppeteer.Page, selector: string): Promise<string> {
        try {
            const existSel = await this.checkExistElement(page, selector);
            if (!existSel) return '';
            const content = await page.$eval(selector, el => el.innerHTML)
            return content ? content : '';
        } catch (error) {
            return '';
        }
    }

    async getTextByXpathFromPage(page: puppeteer.Page, xPath: string): Promise<string> {
        const [elm] = await page.$x(xPath);
        if (elm == null) {
            return '';
        }
        let text = await page.evaluate(j => j.innerText, elm);
        return text.replace(/\n/g, ' ');
    }

    /**
     * analysis name
     * @param name 
     */
    discriminateAndRemove(name: string) : any {
        const companyIdentifiersArray = [ 'GENERAL', 'TRUSTEE', 'TRUSTEES', 'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'OF' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENTS', 'HOLDINGS', 'ESTATE', 'LLP', 'LP', 'TRUST', 'LOAN', 'CONDOMINIUM', 'CHURCH', 'CITY', 'CATHOLIC', 'D/B/A', 'COCA COLA', 'LTD', 'CLINIC', 'TODAY', 'PAY', 'CLEANING', 'COSMETIC', 'CLEANERS', 'FURNITURE', 'DECOR', 'FRIDAY HOMES', 'SAVINGS', 'PROPERTY', 'PROTECTION', 'ASSET', 'SERVICES', 'L L C', 'NATIONAL', 'ASSOCIATION', 'MANAGEMENT', 'PARAGON', 'MORTGAGE', 'CHOICE', 'PROPERTIES', 'J T C', 'RESIDENTIAL', 'OPPORTUNITIES', 'FUND', 'LEGACY', 'SERIES', 'HOMES', 'LOAN'];
        const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.', '&'];
        const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
        const removeFromNameRegexString = `^(.*?)\\b(?:${removeFromNamesArray.join('|')})\\b.*?$`;
        const companyRegex = new RegExp(companyRegexString, 'i');
        const removeFromNamesRegex = new RegExp(removeFromNameRegexString, 'i');
        let isCompanyName = name.match(companyRegex);
        if (isCompanyName) {
            return {
                type: 'company',
                name: name
            }
        }
      
        let cleanName = name.match(removeFromNamesRegex);
        if (cleanName) {
            name = cleanName[1];
        }
        return {
            type: 'person',
            name: name
      }
    }

    /**
     * Parse owner names
     * @param name_str : string
     * @param address : string
     */
    parseOwnerName(name_str: string): any[] {
        const results: any = {};

        // owner name
        let owner_full_name = name_str;
        let owner_first_name = '';
        let owner_last_name = '';
        let owner_middle_name = '';

        const owner_class_name = this.discriminateAndRemove(owner_full_name);
        if (owner_class_name.type === 'person') {
            // const owner_temp_name = parseFullName(owner_class_name.name);
            // owner_first_name = owner_temp_name.first ? owner_temp_name.first : '';
            // owner_last_name = owner_temp_name.last ? owner_temp_name.last : '';
            // owner_middle_name = owner_temp_name.middle ? owner_temp_name.middle : '';
            const names = name_str.split(' ');
            owner_first_name = names[1].trim() ? names[1].trim() : '';
            owner_last_name = names[0].trim() ? names[0].trim() : '';
            owner_middle_name = names[2].trim() ? names[2].trim() : '';
            owner_full_name = owner_first_name + ' ' + owner_last_name + ' ' + owner_middle_name;
        }

        results['full_name'] = owner_full_name;
        results['first_name'] = owner_first_name;
        results['last_name'] = owner_last_name;
        results['middle_name'] = owner_middle_name;
        results['suffix'] = this.getSuffix(owner_full_name);
        return results;
    }

    getSuffix(name: string) : any {
        const suffixList = ['esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.'];
        name = name.toLowerCase();
        for(let suffix of suffixList){
            let regex = new RegExp(' '+suffix, 'gm');
            if (name.match(regex)){
                return suffix;
            }
        }
        return '';
    }
    /**
     * Remove spaces, new lines
     * @param text : string
     */
    simplifyString(text: string): string {
        return text.replace(/( +)|(\n)/gs, ' ').trim();
    }

    /**
     * Compare 2 addresses
     * @param address1 
     * @param address2 
     */
    compareAddress(address1: any, address2: any): Boolean {
        const address1_number = address1.number===undefined ? '' : address1.number.trim().toUpperCase();
        const address2_number = address2 ? (address2.number===undefined ? '' : address2.number.trim().toUpperCase()) : '';
        const address1_prefix = address1 && address1.prefix===undefined ? '' : address1.prefix.trim().toUpperCase();
        const address2_prefix = address2 ? (address2.prefix===undefined ? '' : address2.prefix.trim().toUpperCase()) : '';
        const address1_type = address1.type===undefined ? '' : address1.type.trim().toUpperCase();
        const address2_type = address2 ? (address2.type===undefined ? '' : address2.type.trim().toUpperCase()) : '';
        const address1_street = address1.street===undefined ? '' : address1.street.trim().toUpperCase();
        const address2_street = address2 ? (address2.street===undefined ? '' : address2.street.trim().toUpperCase()) : '';

        return  (address1_number === address2_number) &&
                (address1_prefix === address2_prefix) &&
                (address1_type === address2_type) &&
                (address1_street === address2_street);
    }

    // the main parsing function. if read() succeeds, parseAndSave is started().
    // return true after all parsing is complete 

    // docsToParse is the collection of all address objects to parse from mongo.
    // !!! Only mutate document objects with the properties that need to be added!
    // if you need to multiply a document object (in case of multiple owners
    // or multiple properties (2-3, not 30) you can't filter down to one, use this.cloneMongoDocument(document);
    // once all properties from PA have been added to the document, call 
    // "document.propertyAppraiserProcessed = true" and "await document.save()" (make sure to only call save() once though).
    async parseAndSave(docsToParse: IOwnerProductProperty[]): Promise<boolean>   {
        console.log(`Documents to look up: ${docsToParse.length}.`);
        const page = this.browserPages.propertyAppraiserPage;
        if (page === undefined) return false;
        let start = 0;

        for (let i = start; i < docsToParse.length; i++) {
            if (!this.decideSearchByV2(docsToParse[i])) {
              console.log('Insufficient info for Owner and Property');
              continue;
            }
            try {
                docsToParse[i].propertyAppraiserProcessed = true;
                await docsToParse[i].save();
            } catch(e){
              // console.log(e);
            }
            // do everything that needs to be done for each document here
            // parse address
            let address;
            let search_addr = '';
            let first_name = '';
            let last_name = '';
            let owner_name = '';
            let owner_name_regexp = '';

            if (this.searchBy === 'name') {
                const nameInfo = this.getNameInfo(docsToParse[i].ownerId);
                first_name = nameInfo.first_name;
                last_name = nameInfo.last_name;
                owner_name = nameInfo.owner_name;
                owner_name_regexp = nameInfo.owner_name_regexp;
                if (owner_name === '') continue;
                console.log(`Looking for owner: ${owner_name}`);
            }
            else {
                search_addr = docsToParse[i].propertyId['Property Address'];                   
                address = search_addr;
                console.log(`Looking for address: ${search_addr}`);
            }
            let frame: puppeteer.Frame | null | undefined;
            await page.waitForXPath('//iframe[@id="master-search"]');
            let elementHandle = await page.$('iframe#master-search');
            frame = await elementHandle?.contentFrame();
            if (frame) {
                const inputHandle = await frame.$('input#txtSearch');
                if (inputHandle) {
                    await inputHandle.click({clickCount: 3});
                    await inputHandle.press('Backspace');
                    await inputHandle.type(this.searchBy === 'name' ?  owner_name : search_addr, {delay: 100});
                }

                const searchHandle = await frame.$('button[aria-label="Search Button link"]');
                const searchResult = await this.waitForSuccess(async () => {
                    await Promise.all([
                        searchHandle?.click(),
                        page.waitForNavigation()
                    ])
                })
                if (!searchResult) {
                    return false;
                }   
            }
            const rows = await page.$x('//table[@id="gvSrchResults"]/tbody/tr[contains(@class, "gridrow")]');
            let content = await page.$('div#MainContent_divRealProperty');
            if (rows.length == 0 && !content) {
                await page.goto(this.urls.propertyAppraiserPage, {waitUntil: 'load'});
                continue;
            } 
            if (rows.length > 0) {
                const clickHandle = await page.$x('//table[@id="gvSrchResults"]/tbody/tr[contains(@class, "gridrow")][1]/td[1]');
                for (let i = 0; i < rows.length; i++) {
                    const nameEL = await page.$x(`//table[@id="gvSrchResults"]/tbody/tr[contains(@class, "gridrow")][${i + 1}]/td[1]`);
                    const name_string = await nameEL[0].evaluate(el => el.textContent?.trim());
                    if (name_string?.includes(owner_name)) {
                        const clickResult = await this.waitForSuccess(async () => {
                            await Promise.all([
                                clickHandle[0].click(),
                                page.waitForNavigation()
                            ])
                        })
                        if (!clickResult) {
                            return false;
                        }   
                        break;
                    }
                }
            }
            let result;
            try {
                result = await this.getPropertyInfos(page, address);
            } catch (e) {
            }
            try {
                await this.parseResult(result, docsToParse[i]);
            } catch (e) {                                
            }          
            await page.goto(this.urls.propertyAppraiserPage, {waitUntil: 'load'});
        }        
        return true;
    }

    async parseResult(result: any, document: any) {
        let dataFromPropertyAppraisers = {
            'Full Name': result['ownerName']['full_name'],
            'First Name': result['ownerName']['first_name'],
            'Last Name': result['ownerName']['last_name'],
            'Middle Name': result['ownerName']['middle_name'],
            'Name Suffix': result['ownerName']['suffix'],
            'Mailing Care of Name': '',
            'Mailing Address': result['mailing_address'],
            'Mailing Unit #': '',
            'Mailing City': result['mailing_address_city'] ? result['mailing_address_city'] : '',
            'Mailing State': result['mailing_address_city_parsed'] ? result['mailing_address_city_parsed']['state'] : '',
            'Mailing Zip': result['mailing_address_city_parsed'] ? result['mailing_address_city_parsed']['zip'] : '',
            'Property Address': result['property_address'],
            'Property Unit #': '',
            'Property City': result['property_address_city'],
            'Property State': 'FL',
            'Property Zip': result['property_address_parsed']['zip'] ? result['property_address_parsed']['zip'] : '',
            'County': 'Palm Beach',
            'Owner Occupied': result['owner_occupied'],
            'Property Type': result['property_type'],
            'Total Assessed Value': result['total_assessed_value'],
            'Last Sale Recording Date': result['last_sale_recording_date'],
            'Last Sale Amount': result['last_sale_amount'],
            'Est. Remaining balance of Open Loans': '',
            'Est Value': result['est_value'],
            'Effective Year Built': '',
            'Est Equity': '',
            'Lien Amount': ''
        };
        try{
            await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
        } catch(e){
            //
        } 
    }

    async getPropertyInfos(page: puppeteer.Page, address: any): Promise<any> {
        // name
        const full_name_xpath = '//div[@id="ownerInformationDiv"]/fieldset/table/tbody/tr[2]/td[1]//tbody/tr[2]/td';
        let full_name = await this.getTextByXpathFromPage(page, full_name_xpath);
        let ownerName = this.simplifyString(full_name.replace(/[^a-zA-Z ]/g, ""));
        
        // property address
        const property_address_xpath = '//div[@id="propertyDetailDiv"]//td[@id="tdDetail"]//tbody/tr[2]/td[2]/span';
        let property_address = await this.getTextByXpathFromPage(page, property_address_xpath);
        console.log('Property Address from web: ', property_address);
        const property_address_city_xpath = '//div[@id="propertyDetailDiv"]//td[@id="tdDetail"]//tbody/tr[3]/td[2]/span'
        const property_address_city = await this.getTextByXpathFromPage(page, property_address_city_xpath);
        const property_address_parsed = parser.parseLocation(property_address);

        // mailing address
        const mailing_address_xpath = '//div[@id="ownerInformationDiv"]/fieldset/table/tbody/tr[2]/td[2]//tbody/tr[2]//span';
        let mailing_address = await this.getTextByXpathFromPage(page, mailing_address_xpath);
        const is_valid_address = mailing_address.match(/[a-zA-Z]/g) !== null;
        mailing_address = is_valid_address ? mailing_address : address['full_address'];
        const mailing_address_parsed = parser.parseLocation(mailing_address);
        const mailing_address_city_xpath = '//div[@id="ownerInformationDiv"]/fieldset/table/tbody/tr[2]/td[2]//tbody/tr[4]//span';
        let mailing_address_city_str = await this.getTextByXpathFromPage(page, mailing_address_city_xpath);
        let mailing_address_city = mailing_address_city_str.replace(/\d/g, '').trim();
        mailing_address_city = mailing_address_city.substring(0, mailing_address_city.length - 3);
        let mailing_address_city_parsed = parser.parseLocation(mailing_address + ' ' +  mailing_address_city_str);

        // owner occupied
        const owner_occupied = this.compareAddress(property_address, mailing_address_parsed);
        
        // sales info
        const last_sale_recording_date_xpath = '//table[@id="MainContent_gvSalesInfo"]/tbody/tr[2]/td[1]';
        const last_sale_amount_xpath = '//table[@id="MainContent_gvSalesInfo"]/tbody/tr[2]/td[2]';
        const last_sale_recording_date = await this.getTextByXpathFromPage(page, last_sale_recording_date_xpath);
        const last_sale_amount = await this.getTextByXpathFromPage(page, last_sale_amount_xpath);

        // property type
        const property_type_xpath = '//span[@id="MainContent_lblUsecode"]';
        const property_type = await this.getTextByXpathFromPage(page, property_type_xpath);

        // assessed value and est. value
        const total_assessed_value_xpath = '//span[@id="MainContent_lblAssessedValue1"]';
        const est_value_xpath = '//span[@id="MainContent_lblMarketValue1"]';
        const total_assessed_value = await this.getTextByXpathFromPage(page, total_assessed_value_xpath);
        const est_value = await this.getTextByXpathFromPage(page, est_value_xpath);
        return {
            ownerName,
            property_address,
            property_address_city,
            property_address_parsed,
            mailing_address,
            mailing_address_city,
            mailing_address_city_parsed,
            owner_occupied,
            property_type,
            total_assessed_value, 
            last_sale_recording_date, 
            last_sale_amount, 
            est_value
        }

    }

    async waitForSuccess(func: Function): Promise<boolean> {
        let retry_count = 0;
        while (true){
            if (retry_count > 30){
                console.error('Connection/website error for 30 iteration.');
                return false;
            }
            try {
                await func();
                break;
            }
            catch (error) {
                retry_count++;
                console.log(`retrying search -- ${retry_count}`);
            }
        }
        return true;
  }
}