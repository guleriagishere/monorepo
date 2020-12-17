// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// import axios from 'axios';
// const parser = require('parse-address');
// const {parseFullName} = require('parse-full-name');

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://www.collincad.org/propertysearch'
//     }

//     xpaths = {
//         isPAloaded: '//button[@type="submit"]'
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async readDocsToParse() {
//         const docsToParse = await this.getDocumentsArrayFromMongo(this.state, this.county, this.categories);
//         return docsToParse;
//     }

//     // use this to initialize the browser and go to a specific url.
//     // setParamsForPage is needed (mainly for AWS), do not remove or modify it please.
//     // return true when page is usable, false if an unexpected error is encountered.
//     async init(): Promise<boolean> {
//         this.browser = await this.launchBrowser();
//         this.browserPages.propertyAppraiserPage = await this.browser.newPage();
//         await this.browserPages.propertyAppraiserPage.setDefaultTimeout(60000);
//         await this.setParamsForPage(this.browserPages.propertyAppraiserPage);
//         try {
//             await this.browserPages.propertyAppraiserPage.goto(this.urls.propertyAppraiserPage, { waitUntil: 'load' });
//             return true;
//         } catch (err) {
//             console.warn(err);
//             return false;
//         }
//     };

//     // use this as a middle layer between init() and parseAndSave().
//     // this should check if the page is usable or if there was an error,
//     // so use an xpath that is available when page is usable.
//     // return true when it's usable, false if it errors out.
//     async read(): Promise<boolean> {
//         try {
//             await this.browserPages.propertyAppraiserPage?.waitForXPath(this.xpaths.isPAloaded);
//             return true;
//         } catch (err) {
//             console.warn('Problem loading property appraiser page.');
//             return false;
//         }
//     }

//     /**
//      * convert address to required infos
//      * @param document : IPublicRecordAttributes 
//      *  full_address:  1527 N 23rd St, Lincoln, NE 68503
//         street_name:   23rd St
//         street_full:   1527 N 23rd St
//         parsed
//             number:     1527
//             prefix:     N
//             street:     23rd
//             type:     St
//             city:       Lincoln
//             state:      NE
//             zip:        68503
//      */
//     getAddress(document: IPublicRecordAttributes): any {
//       // 'Property Address': '162 DOUGLAS HILL RD',
//       // 'Property City': 'WEST BALDWIN',
//       // County: 'Cumberland',
//       // 'Property State': 'ME',
//       // 'Property Zip': '04091',
//       const full_address = `${document['Property Address']}, ${document['Property City']}, ${document['Property State']} ${document['Property Zip']}`
//       const parsed = parser.parseLocation(full_address);
      
//       let street_name = parsed.street.trim();
//       let street_full = document['Property Address'];
//       let street_with_type = (parsed.street + ' ' + (parsed.type ? parsed.type : '')).trim();

//       return {
//         full_address,
//         street_name,
//         street_with_type,
//         street_full,
//         parsed
//       }
//     }

//     getAddressFromParsed(parsed: any): string {
//       let address = '';
//       if (parsed.number) address = parsed.number + ' ';
//       if (parsed.prefix) address += parsed.prefix + ' ';
//       if (parsed.street) address += parsed.street + ' ';
//       if (parsed.type) address += parsed.type + ' ';
//       address = address.replace(/\s+/g, ' ').trim().toUpperCase();
//       return address;
//     }

//     /**
//      * check if element exists
//      * @param page 
//      * @param selector 
//      */
//     async checkExistElement(page: puppeteer.Page, selector: string): Promise<Boolean> {
//       const exist = await page.$(selector).then(res => res !== null);
//       return exist;
//     }

//     /**
//      * get textcontent from specified element
//      * @param page 
//      * @param root 
//      * @param selector 
//      */
//     async getElementTextContent(page: puppeteer.Page, selector: string): Promise<string> {
//       try {
//         const existSel = await this.checkExistElement(page, selector);
//         if (!existSel) return '';
//         let content = await page.$eval(selector, el => el.textContent)
//         return content ? content.trim() : '';
//       } catch (error) {
//         console.log(error)
//         return '';
//       }
//     }
//     /**
//      * get innerHTML from specified element
//      * @param page 
//      * @param root 
//      * @param selector 
//      */
//     async getElementHtmlContent(page: puppeteer.Page, selector: string): Promise<string> {
//       try {
//         const existSel = await this.checkExistElement(page, selector);
//         if (!existSel) return '';
//         const content = await page.$eval(selector, el => el.innerHTML)
//         return content ? content : '';
//       } catch (error) {
//         console.log(error)
//         return '';
//       }
//     }

//         /**
//      * get innerHTML from specified element
//      * @param page 
//      * @param root 
//      * @param selector 
//      */
//     async getElementInnerText(page: puppeteer.Page, selector: string): Promise<string> {
//       try {
//         const existSel = await this.checkExistElement(page, selector);
//         if (!existSel) return '';
//         const content = await page.evaluate(el => el.innerText, (await page.$(selector)));
//         return content ? content : '';
//       } catch (error) {
//         console.log(error)
//         return '';
//       }
//     }

//     /**
//      * analysis name
//      * @param name 
//      */
//     discriminateAndRemove(name: string) : any {
//       const companyIdentifiersArray = [ 'GENERAL', 'TRUSTEE', 'TRUSTEES', 'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'OF' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENTS', 'HOLDINGS', 'ESTATE', 'LLP', 'LP', 'TRUST', 'LOAN', 'CONDOMINIUM', 'CHURCH', 'CITY', 'CATHOLIC', 'D/B/A', 'COCA COLA', 'LTD', 'CLINIC', 'TODAY', 'PAY', 'CLEANING', 'COSMETIC', 'CLEANERS', 'FURNITURE', 'DECOR', 'FRIDAY HOMES', 'SAVINGS', 'PROPERTY', 'PROTECTION', 'ASSET', 'SERVICES', 'L L C', 'NATIONAL', 'ASSOCIATION', 'MANAGEMENT', 'PARAGON', 'MORTGAGE', 'CHOICE', 'PROPERTIES', 'J T C', 'RESIDENTIAL', 'OPPORTUNITIES', 'FUND', 'LEGACY', 'SERIES', 'HOMES', 'LOAN'];
//       const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.', '&'];
//       const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
//       const removeFromNameRegexString = `^(.*?)\\b(?:${removeFromNamesArray.join('|')})\\b.*?$`;
//       const companyRegex = new RegExp(companyRegexString, 'i');
//       const removeFromNamesRegex = new RegExp(removeFromNameRegexString, 'i');
//       let isCompanyName = name.match(companyRegex);
//       if (isCompanyName) {
//           return {
//               type: 'company',
//               name: name
//           }
//       }
      
//       let cleanName = name.match(removeFromNamesRegex);
//       if (cleanName) {
//           name = cleanName[1];
//       }
//       return {
//           type: 'person',
//           name: name
//       }
//     }

//     /**
//      * Parse owner names
//      * @param name_str : string
//      * @param address : string
//      */
//     parseOwnerName(name_str: string): any[] {
//       const result: any = {};

//       // owner name
//       let owner_full_name = name_str;
//       let owner_first_name = '';
//       let owner_last_name = '';
//       let owner_middle_name = '';

//       const owner_class_name = this.discriminateAndRemove(owner_full_name);
//       if (owner_class_name.type === 'person') {
//         const owner_temp_name = parseFullName(owner_class_name.name);
//         owner_first_name = owner_temp_name.first ? owner_temp_name.first : '';
//         owner_last_name = owner_temp_name.last ? owner_temp_name.last : '';
//         owner_middle_name = owner_temp_name.middle ? owner_temp_name.middle : '';
//       }

//       result['full_name'] = owner_full_name;
//       result['first_name'] = owner_first_name;
//       result['last_name'] = owner_last_name;
//       result['middle_name'] = owner_middle_name;
//       result['suffix'] = this.getSuffix(owner_full_name);
//       return result;
//     }

//     getSuffix(name: string) : any {
//       const suffixList = ['esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.'];
//       name = name.toLowerCase();
//       for(let suffix of suffixList){
//           let regex = new RegExp(' '+suffix, 'gm');
//           if (name.match(regex)){
//               return suffix;
//           }
//       }
//       return '';
//     }
//     /**
//      * Remove spaces, new lines
//      * @param text : string
//      */
//     simplifyString(text: string): string {
//       return text.replace(/( +)|(\n)/gs, ' ').trim();
//     }

//     /**
//      * Compare 2 addresses
//      * @param address1 
//      * @param address2 
//      */
//     compareAddress(address1: any, address2: any): Boolean {
//       const address1_number = address1.number===undefined ? '' : address1.number.trim().toUpperCase();
//       const address2_number = address2 ? (address2.number===undefined ? '' : address2.number.trim().toUpperCase()) : '';
//       const address1_prefix = address1 && address1.prefix===undefined ? '' : address1.prefix.trim().toUpperCase();
//       const address2_prefix = address2 ? (address2.prefix===undefined ? '' : address2.prefix.trim().toUpperCase()) : '';
//       const address1_type = address1.type===undefined ? '' : address1.type.trim().toUpperCase();
//       const address2_type = address2 ? (address2.type===undefined ? '' : address2.type.trim().toUpperCase()) : '';
//       const address1_street = address1.street===undefined ? '' : address1.street.trim().toUpperCase();
//       const address2_street = address2 ? (address2.street===undefined ? '' : address2.street.trim().toUpperCase()) : '';

//       return  (address1_number === address2_number) &&
//               (address1_prefix === address2_prefix) &&
//               (address1_type === address2_type) &&
//               (address1_street === address2_street);
//     }

//     // the main parsing function. if read() succeeds, parseAndSave is started().
//     // return true after all parsing is complete 

//     // docsToParse is the collection of all address objects to parse from mongo.
//     // !!! Only mutate document objects with the properties that need to be added!
//     // if you need to multiply a document object (in case of multiple owners
//     // or multiple properties (2-3, not 30) you can't filter down to one, use this.cloneMongoDocument(document);
//     // once all properties from PA have been added to the document, call 
//     // "document.propertyAppraiserProcessed = true" and "await document.save()" (make sure to only call save() once though).
//     async parseAndSave(docsToParse: any): Promise<boolean> {
//         console.log(`Documents to look up: ${docsToParse.length}.`);

//         const page = this.browserPages.propertyAppraiserPage;
//         if (page === undefined) return false;
//         page.setDefaultTimeout(60000);

//         for (let document of docsToParse) {
//           if (!this.decideSearchByV2(document)) {
//             console.log('Insufficient info for Owner and Property');
//             continue;
//           }
//           // do everything that needs to be done for each document here
//           // parse address
//           let address: any;
//           let first_name = '';
//           let last_name = '';
//           let owner_name = '';
//           let owner_name_regexp = '';  

//           if (this.searchBy === 'address') {
//             // input address
//             const address = this.getAddress(document.propertyId);
            
//             const inputNumberHandle = await page.$x('//input[@id="situs_num"]');
//             const inputNameHandle = await page.$x('//input[@id="situs_street"]');
//             if (address.parsed.number)
//               await inputNumberHandle[0].type(address.parsed.number, {delay: 150});
//             if (address.parsed.street)
//               await inputNameHandle[0].type(address.parsed.street, {delay: 150});
//             if (address.parsed.type !== undefined) {
//               await page.select('select[id="situs_street_suffix"]', address.parsed.type.toUpperCase().trim());
//             }
//           }
//           else {
//             const nameInfo = this.getNameInfo(document.ownerId);
//             first_name = nameInfo.first_name;
//             last_name = nameInfo.last_name;
//             owner_name = nameInfo.owner_name;
//             owner_name_regexp = nameInfo.owner_name_regexp;
//             if (owner_name === '') continue;

//             const inputNameHandle = await page.$x('//input[@id="owner_name"]');
//             await inputNameHandle[0].type(owner_name, {delay: 150});
//           }
//           await Promise.all([
//             page.click('button[type="submit"]'),
//             page.waitForNavigation()
//           ]);

//           // fetch data
//           if (this.searchBy === 'address') {
//             const moreinfo = await page.$('table#propertysearchresults > tbody > tr > td:nth-child(2) > a');
//             if (moreinfo) {
//               const datalink = await page.evaluate(el => el.href, moreinfo);
//               await Promise.all([
//                 page.goto(datalink, {waitUntil:'load'}),
//                 page.waitForNavigation()
//               ]);                
//               const result = await this.getPropertyInfos(page);
//               this.parseResult(result, document);
//             }
//           }
//           else {
//             const datalinks = [];
//             const rows = await page.$x('//*[@id="propertysearchresults"]/tbody/tr');
//             for (const row of rows) {
//               let owner_name_get: any = await page.evaluate(el => el.children[2].textContent, row);
//               const regexp = new RegExp(owner_name_regexp);
//               if (regexp.exec(owner_name_get.toUpperCase())) {
//                 const datalink = await page.evaluate(el => el.children[1].children[0].href, row);
//                 console.log(datalink);
//                 datalinks.push(datalink);
//               }
//             }
//             for (const datalink of datalinks) {
//               await Promise.all([
//                 page.goto(datalink, {waitUntil:'load'}),
//                 page.waitForNavigation()
//               ]);                
//               const result = await this.getPropertyInfos(page);
//               this.parseResult(result, document);
//             }
//           }
//         }
//         return true;
//     }

//     async parseResult(result: any, document: any) {
//       for (let index = 0; index < result['owner_names'].length ; index++) {
//         const owner_name = result['owner_names'][index];
        
//         if (index == 0) {
//           let dataFromPropertyAppraisers = {
//             'Full Name': owner_name['full_name'],
//             'First Name': owner_name['first_name'],
//             'Last Name': owner_name['last_name'],
//             'Middle Name': owner_name['middle_name'],
//             'Name Suffix': owner_name['suffix'],
//             'Mailing Care of Name': '',
//             'Mailing Address': result['mailing_address'],
//             'Mailing Unit #': '',
//             'Mailing City': result['mailing_address_parsed']?result['mailing_address_parsed']['city']:'',
//             'Mailing State': result['mailing_address_parsed']?result['mailing_address_parsed']['state']:'',
//             'Mailing Zip': result['mailing_address_parsed']?result['mailing_address_parsed']['zip']:'',
//             'Property Address': result['property_address'],
//             'Property Unit #': '',
//             'Property City': result['property_address_parsed'] ? result['property_address_parsed']['city'] : '',
//             'Property State': 'TX',
//             'Property Zip': result['property_address_parsed'] ? result['property_address_parsed']['zip'] : '',
//             'County': 'Collin',
//             'Owner Occupied': result['owner_occupied'],
//             'Property Type': result['property_type'],
//             'Total Assessed Value': result['total_assessed_value'],
//             'Last Sale Recording Date': result['last_sale_recording_date'],
//             'Last Sale Amount': result['last_sale_amount'],
//             'Est. Remaining balance of Open Loans': '',
//             'Est Value': result['est_value'],
//             'Effective Year Built': '',
//             'Est Equity': '',
//             'Lien Amount': ''
//           };             
//           console.log(dataFromPropertyAppraisers);
//           await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
//         }
//         // else {
//         //   let newDocument = await this.cloneDocument(document)
//         //   newDocument['Full Name'] = owner_name['full_name'];
//         //   newDocument['First Name'] = owner_name['first_name'];
//         //   newDocument['Last Name'] = owner_name['last_name'];
//         //   newDocument['Middle Name'] = owner_name['middle_name'];
//         //   newDocument['Name Suffix'] = owner_name['suffix'];
//         //   console.log(newDocument);
//         //   await this.saveToLineItem(newDocument);
//         //   await this.saveToOwnerProductProperty(newDocument);
//         // }
//       }   
//     }

//     async getPropertyInfos(page: puppeteer.Page): Promise<any> {
//       // name
//       const full_name_selector = 'div#owner > dl > dd:nth-child(4) > a';
//       const full_name = await this.getElementTextContent(page, full_name_selector);
//       const owner_names = [];
//       const owner_name_arr = full_name.split('&').map(str => this.simplifyString(str));
//       for (let owner_name_iter of owner_name_arr) {
//         if (owner_name_iter === '') break;
//         const ownerName = this.parseOwnerName(owner_name_iter);
//         owner_names.push(ownerName);
//       }

//       // property address
//       const property_address_selector = 'div#property_details > div.propertyinfo_container:nth-child(2) > div.propertyinfo:nth-child(2) > dl > dd:nth-child(10)';
//       const property_address_html = await this.getElementInnerText(page, property_address_selector);
//       const property_address_full = property_address_html.replace('\n', ', ').replace(/( +)|(\n)/gs, ' ').trim();
//       let property_address = property_address_html.split('\n')[0].replace(/( +)|(\n)/gs, ' ').trim();
//       const property_address_parsed = parser.parseLocation(property_address_full);
      
//       // mailing address
//       const mailing_address_selector = 'div#owner > dl > dd:nth-child(10)';
//       const mailing_address_html = await this.getElementInnerText(page, mailing_address_selector);
//       const mailing_address_full = mailing_address_html.replace('\n', ', ').replace(/( +)|(\n)/gs, ' ').trim();
//       let mailing_address = mailing_address_html.split('\n')[0].replace(/( +)|(\n)/gs, ' ').trim();
//       const mailing_address_parsed = parser.parseLocation(mailing_address_full);
    
//       // owner occupied
//       const owner_occupied = this.compareAddress(property_address_parsed, mailing_address_parsed);
    
//       // property type
//       const property_type_selector = 'div#property_details > div.propertyinfo_container:nth-child(2) > div.propertyinfo:nth-child(2) > dl > dd:nth-child(8)';
//       const property_type = await this.getElementTextContent(page, property_type_selector);
    
//       // sales info
//       const last_sale_recording_date_selector = 'div#deedhistory > table > tbody > tr:first-child > td:first-child';
//       const last_sale_recording_date = await this.getElementTextContent(page, last_sale_recording_date_selector);
//       const last_sale_amount = 'N/A';
      
//       // assessed value and est. value
//       const total_assessed_value_selector = 'div#property_details > div.propertyinfo_container:nth-child(4) > div.propertyinfo:nth-child(5) > dl:nth-child(3) > dd:nth-child(10)';
//       const est_value_selector = 'div#property_details > div.propertyinfo_container:nth-child(4) > div.propertyinfo:nth-child(5) > dl:nth-child(3) > dd:nth-child(6)';
//       const total_assessed_value = await this.getElementTextContent(page, total_assessed_value_selector);
//       const est_value = await this.getElementTextContent(page, est_value_selector);
      
//       return {
//         owner_names, 
//         property_address,
//         property_address_parsed,
//         mailing_address,
//         mailing_address_parsed, 
//         owner_occupied,
//         property_type, 
//         total_assessed_value, 
//         last_sale_recording_date, 
//         last_sale_amount, 
//         est_value
//       }
//     }
// }