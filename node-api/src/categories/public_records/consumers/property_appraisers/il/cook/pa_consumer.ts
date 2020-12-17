import puppeteer from 'puppeteer';
import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
const parser = require('parse-address');
const {parseFullName} = require('parse-full-name');

import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';
import { IOwnerProductProperty } from '../../../../../../models/owner_product_property';
import { IProperty } from '../../../../../../models/property';
import { count } from 'console';

export default class PAConsumer extends AbstractPAConsumer {
    publicRecordProducer: IPublicRecordProducer;
    ownerProductProperties: IOwnerProductProperty[];

    urls = {
        pinPage: 'https://www.cookcountyassessor.com/advanced-search',
        propertyPage: 'http://cookcountypropertyinfo.com/'
    }

    xpaths = {
        isPAloaded: '//button[@id="edit-submit--2"]'
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
            await this.browserPages.propertyAppraiserPage.goto(this.urls.pinPage, { waitUntil: 'load' });
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
        const result: any = {};

        // owner name
        let owner_full_name = name_str;
        let owner_first_name = '';
        let owner_last_name = '';
        let owner_middle_name = '';

        const owner_class_name = this.discriminateAndRemove(owner_full_name);
        if (owner_class_name.type === 'person') {
            const owner_temp_name = parseFullName(owner_class_name.name);
            owner_first_name = owner_temp_name.first ? owner_temp_name.first : '';
            owner_last_name = owner_temp_name.last ? owner_temp_name.last : '';
            owner_middle_name = owner_temp_name.middle ? owner_temp_name.middle : '';
        }

        result['full_name'] = owner_full_name;
        result['first_name'] = owner_first_name;
        result['last_name'] = owner_last_name;
        result['middle_name'] = owner_middle_name;
        result['suffix'] = this.getSuffix(owner_full_name);
        return result;
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
            let address: any;
            let search_addr;

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
                address = this.getAddress(docsToParse[i].propertyId);
                search_addr = docsToParse[i].propertyId['Property Address'];
                if (!address['number'] || !address['street'] || !address['city'] || !search_addr) {
                    console.log('Address is missing HOUSE NUMBER or STREET or CITY');
                    continue;
                }
                console.log(`Looking for address: ${search_addr}`);
            }

            let retry_count = 0;
            while (true){
                if (retry_count > 30){
                    console.error('Connection/website error for 30 iteration.');
                    return false;
                }
                try {
                    await page.waitForXPath('//input[@id="edit-get-applicantname"]');
                    break;
                }
                catch (error) {
                    retry_count++;
                    console.log('retrying ... ', retry_count)
                    await page.reload();
                }
            }    

            if (this.searchBy === 'name') {
                const inputHandle = await page.$('input#edit-get-applicantname');
                await inputHandle!.click({clickCount: 3});
                await inputHandle!.press('Backspace');
                await inputHandle!.type(owner_name, {delay: 100});
                await page.click('button#edit-submit--2');
            }
            else {
                const input_number = await page.$('input#edit-get-housenumberbeg');
                await input_number?.type(address['number'], {delay: 150});
                if (address['prefix']) {
                    await page.select('select#edit-get-direction', address['prefix']);
                }
                const input_street = await page.$('input#edit-get-streetname');
                await input_street?.type(address['street'], {delay: 150});
                const input_city = await page.$('input#edit-get-city');
                await input_city?.type(address['city'], {delay: 150});
                await page.click('button#edit-submit');
            }
            const result_handler = await Promise.race([
                page.waitForXPath('//*[contains(text(), "no result")]'),
                page.waitForXPath('//*[contains(text(), "properties in  neighborhood")]')
            ]);
            const result_text = await page.evaluate(el => el.textContent, result_handler);
            if (result_text.indexOf('no result') > -1) {
                console.log('No results found');
                continue;
            }

            const search_results = await page.$x('//table[@id="search-result"]/tbody/tr');
            if (search_results.length == 0) {
                continue;
            }
            const temp_link = await search_results[0].evaluate(el => el.children[0].children[0].getAttribute('href'));
            if (temp_link?.trim() != '/pin/') {
                const rows = await page.$x('//table[@id="search-result"]/tbody/tr');
                let links = [];
                if (this.searchBy === 'name') {
                    for (const row of rows) {
                        const link = await page.evaluate(el => el.children[0].children[0].href, row);
                        links.push(link);
                    }
                } else {
                    for (const row of rows) {
                        const {addr, city, link} = await page.evaluate(el => ({
                            addr: el.children[2].textContent?.trim(), 
                            city: el.children[3].textContent?.trim(), 
                            link: el.children[0].children[0].href
                        }), row);
                        if (addr === search_addr && city === address['city']) {
                            links.push(link);
                        }
                    }
                }
                if (links.length === 0) {
                    console.log("The search results is not reliable! (different from the keyword)");
                    continue;
                }
                for (const link of links) {
                    await page.goto(link, {waitUntil: 'load'});
                    let result1 = await this.getPropertyInfos(page);
                    let result2 = await this.searchByPin(page, result1.pin);
                    if (result2) await this.parseResult({...result1, ...result2}, docsToParse[i]);
                }
            } else {
                console.log('No Results!');                        
            }
            await page.waitForXPath('//a[@href="/advanced-search"]');
            const backSearchHandle = await page.$x('//a[@href="/advanced-search"]');
            const bachSearchResult = await this.waitForSuccess(async () => {
                await Promise.all([
                    backSearchHandle[0].click(),
                    page.waitForNavigation()
                ])
            })
            if (!bachSearchResult) {
                return false;
            }    
            await this.randomSleepIn5Sec();      
        }        
        return true;
    }

    async parseResult(result: any, document: any) {
        let dataFromPropertyAppraisers = {
            'Full Name': result['owner_names']['full_name'],
            'First Name': result['owner_names']['first_name'],
            'Last Name': result['owner_names']['last_name'],
            'Middle Name': result['owner_names']['middle_name'],
            'Name Suffix': result['owner_names']['suffix'],
            'Mailing Care of Name': '',
            'Mailing Address': result['mailing_address'],
            'Mailing Unit #': '',
            'Mailing City': '',
            'Mailing State': '',
            'Mailing Zip': '',
            'Property Address': result['property_address'],
            'Property Unit #': '',
            'Property City': result['property_city'],
            'Property State': 'IL',
            'Property Zip': '',
            'County': 'Cook',
            'Owner Occupied': result['property_address'] === result['mailing_address'],
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

    async searchByPin(page: puppeteer.Page, pin_number: string): Promise<any> {
        await page.goto(this.urls.propertyPage, {waitUntil: 'networkidle0'});
        const pin_numbers = pin_number.split('-');
        if (pin_numbers.length !== 5) {
            console.log('Invalid PIN number');
            return null;
        }
        for (let index = 0 ; index < 5 ; index++) {
            const inputbox = await page.$(`input#pinBox${index+1}`);
            await inputbox?.type(pin_numbers[index], {delay: 150});
        }
        await Promise.all([
            page.click('#ContentPlaceHolder1_PINAddressSearch_btnSearch'),
            page.waitForNavigation()
        ]);
        const name = await this.getTextByXpathFromPage(page, '//*[@id="ContentPlaceHolder1_PropertyInfo_propertyMailingName"]');
        const mailing_address = await this.getTextByXpathFromPage(page, '//*[@id="ContentPlaceHolder1_PropertyInfo_propertyMailingAddress"]');
        const ownernames = this.parseOwnerName(name);
        return {
            ownernames,
            mailing_address
        };
    }

    async getPropertyInfos(page: puppeteer.Page): Promise<any> {
        // PIN
        const pin = await this.getTextByXpathFromPage(page, '//*[text()="Pin"]/following-sibling::span[1]');

        // property address
        const property_address = await this.getTextByXpathFromPage(page, '//*[text()="Address"]/following-sibling::span[1]');
        const property_city = await this.getTextByXpathFromPage(page, '//*[text()="City"]/following-sibling::span[1]');

        // sales info
        const last_sale_recording_date = '';
        const last_sale_amount = '';

        // property type
        const property_type = await this.getTextByXpathFromPage(page, '//span[text()="Use"]/following-sibling::span[1]');

        // assessed value and est. value
        const total_assessed_value = await this.getTextByXpathFromPage(page, '//span[contains(text(), "Total Assessed Value")]/parent::div/span[2]');
        const est_value = await this.getTextByXpathFromPage(page, '//span[contains(text(), "Total Estimated Market Value")]/parent::div/span[2]');

        return {
            pin,
            property_address,
            property_city,
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