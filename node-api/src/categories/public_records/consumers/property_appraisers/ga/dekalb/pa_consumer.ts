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
//         propertyAppraiserPage: 'https://propertyappraisal.dekalbcountyga.gov/search/commonsearch.aspx?mode=realprop'
//     }

//     xpaths = {
//         isPAloaded: '//input[@id="fldSearchFor"]'
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
//     async getTextByXpathFromPage(page: puppeteer.Page, xPath: string) {
//       const [elm] = await page.$x(xPath);
//       if (elm == null) {
//           return '';
//       }
//       let text = await page.evaluate(j => j.innerText, elm);
//       return text.replace(/\n/g, ' ');
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
//       const address1_prefix = address2 && address1.prefix===undefined ? '' : address1.prefix.trim().toUpperCase();
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
//     async parseAndSave(docsToParse: IPublicRecordAttributes[]): Promise<boolean> {
//         console.log(`Documents to look up: ${docsToParse.length}.`);
        
//         const page = this.browserPages.propertyAppraiserPage;
//         if (page === undefined) return false;
//         page.setDefaultTimeout(60000);

//         for (let document of docsToParse) {
//             this.searchBy = document["Property Address"] ? 'address' : 'name';
//             // do everything that needs to be done for each document here
//             // parse address
//             let address;
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';

//            if (this.searchBy === 'name') {
//               const nameInfo = this.getNameInfo(document);
//               first_name = nameInfo.first_name;
//               last_name = nameInfo.last_name;
//               owner_name = nameInfo.owner_name;
//               owner_name_regexp = nameInfo.owner_name_regexp;
//               if (owner_name === '') continue;
//               console.log(`Looking for owner: ${owner_name}`);
//             }
//             else {
//               address = this.getAddress(document)
//               let addressToLookFor = document["Property Address"];
//               console.log(`Looking for address: ${addressToLookFor}`);
//             }

//             let retry_count = 0;
//             while (true){
//               if (retry_count > 15){
//                   console.error('Connection/website error for 15 iteration.');
//                   await this.browser?.close();
//                   return false;
//               }
//               try {
//                 await page.goto(this.urls.propertyAppraiserPage, { waitUntil: 'load'});
//               } catch (error) {
//                 await page.reload();
//               }
//               try {                
//                 // check agree
//                 const isAgreeBtn = await this.checkExistElement(page, 'button#btAgree');
//                 if (isAgreeBtn) {
//                   await Promise.all([
//                     page.click('button#btAgree'),
//                     page.waitForNavigation()
//                   ]);
//                 }
//                 await page.waitForSelector('button[type="submit"]');

//                 if (this.searchBy === 'name') {
//                   const [inputNameHandle] = await page.$x('//input[@id="inpOwner1"]');
//                   await inputNameHandle.type(owner_name, {delay: 100});
//                   await Promise.all([
//                     inputNameHandle.type(String.fromCharCode(13), {delay: 150}),
//                     page.waitForNavigation()
//                   ]);
//                 }
//                 else {
//                   const inputStNumHandle = await page.$x('//input[@id="inpNo"]');
//                   const inputStreetHandle = await page.$x('//input[@id="inpStreet"]');
//                   if (address.parsed.number)
//                   await inputStNumHandle[0].type(address.parsed.number, {delay: 100});
//                   if (address.parsed.street)
//                   await inputStreetHandle[0].type(address.parsed.street, {delay: 100});
//                   if (address.parsed.type)
//                   await page.select('select[id="inpSuf"]', address.parsed.type.toUpperCase().trim());
//                   if (address.parsed.city)
//                   await page.select('select[id="inpZip1"]', address.parsed.city.toUpperCase().trim());
//                   await Promise.all([
//                     inputStreetHandle[0].type(String.fromCharCode(13), {delay: 150}),
//                     page.waitForNavigation()
//                   ]);
//                 }

//                 const rows = await page.$x('//table[@id="searchResults"]/tbody/tr[position()>2]');
//                 if (rows.length === 0) {
//                   console.log("No house found");
//                   break;
//                 }

//                 const ids = [];
//                 if (this.searchBy === 'name') {
//                     for (const row of rows) {
//                         const {name, id} = await page.evaluate(el => ({name: el.children[2].textContent.trim(), id: el.children[1].textContent}), row);
//                         const regexp = new RegExp(owner_name_regexp);
//                         if (!regexp.exec(name.toUpperCase())) continue;
//                         ids.push(id);
//                     }
//                 }
//                 else {
//                     let id = await page.evaluate(el => el.children[1].textContent, rows[0]);
//                     ids.push(id);
//                 }

//                 if (ids.length === 0) {
//                     console.log("No house found");
//                     break;
//                 }

//                 for (const id of ids) {
//                   const [row] = await page.$x(`//table[@id="searchResults"]/tbody/tr[./td[contains(., "${id}")]]`);
//                   if (row) {
//                     await Promise.all([
//                       row.click(),
//                       page.waitForNavigation()
//                     ]);
//                     const result = await this.getPropertyInfos(page, address);
//                     this.parseResult(result, document);
//                     await page.goBack();
//                     await page.goBack();
//                     await page.goBack();
//                   }
//                 }
                  
//                 break;                    
//               } catch (error) {
//                 console.log(error);
//                 console.log('retrying... ', retry_count);
//                 retry_count++;
//                 await page.waitFor(1000);
//               }    
//             }                       
//         }
//         return true;
//     }

//     async parseResult(result: any, document: IPublicRecordAttributes) {
//       for (let index = 0; index < result['owner_names'].length ; index++) {
//         const owner_name = result['owner_names'][index];
//         if (index == 0) {
//           document['Full Name'] = owner_name['full_name'];
//           document['First Name'] = owner_name['first_name'];
//           document['Last Name'] = owner_name['last_name'];
//           document['Middle Name'] = owner_name['middle_name'];
//           document['Name Suffix'] = owner_name['suffix'];
//           document['Owner Occupied'] = result['owner_occupied'];
//           if (this.searchBy === 'name') {
//             document['Property Address'] = result['property_address'];
//             document['Property State'] = 'GA';
//           }
//           document['Mailing Care of Name'] = '';
//           document['Mailing Address'] = result['mailing_address'];
//           if (result['mailing_address_parsed']) {
//             document['Mailing City'] = result['mailing_address_parsed']['city'];
//             document['Mailing State'] = result['mailing_address_parsed']['state'];
//             document['Mailing Zip'] = result['mailing_address_parsed']['zip'];
//           }
//           document['Mailing Unit #'] = '';
//           document['Property Type'] = result['property_type'];
//           document['Total Assessed Value'] = result['total_assessed_value'];
//           document['Last Sale Recording Date'] = result['last_sale_recording_date'];
//           document['Last Sale Amount'] = result['last_sale_amount'];
//           document['Est. Remaining balance of Open Loans'] = '';
//           document['Est Value'] = result['est_value'];
//           document['Effective Year Built'] = '';
//           document['Est Equity'] = '';
//           document.propertyAppraiserProcessed = true;
//           console.log(document);
//           await document.save();
//         }
//         else {
//           let newDocument = await this.cloneMongoDocument(document)
//           newDocument['Full Name'] = owner_name['full_name'];
//           newDocument['First Name'] = owner_name['first_name'];
//           newDocument['Last Name'] = owner_name['last_name'];
//           newDocument['Middle Name'] = owner_name['middle_name'];
//           newDocument['Name Suffix'] = owner_name['suffix'];
//           console.log(newDocument);
//           await newDocument.save();
//         }
//       }   
//     }

//     async getPropertyInfos(page: puppeteer.Page, address: any): Promise<any> {
//       // name
//       let owner_name = await this.getElementTextContent(page, 'div#datalet_div_3 > table:nth-child(3) > tbody > tr:nth-child(2) > td:first-child');
//       let owner_names = [];
//       const ownerName = this.parseOwnerName(owner_name);
//       owner_names.push(ownerName);

//       // property address
//       const property_address_xpath = '//*[text()="Address"]/ancestor::tr[1]/td[2]';
//       let property_address = await this.getTextByXpathFromPage(page, property_address_xpath);
//       property_address = property_address.replace(/\s+/gm, ' ').trim();

//       // mailing address
//       const mailing_name_address_str_selector = 'div#datalet_div_2 > table:nth-child(3) > tbody > tr:first-child > td:first-child';
//       const mailing_name_address_str = await this.getElementHtmlContent(page, mailing_name_address_str_selector);
//       const mailing_name_address = mailing_name_address_str.split('<br>');
//       const mailing_address = this.simplifyString(mailing_name_address.slice(mailing_name_address.length-2).join(' '));
//       const mailing_address_parsed = parser.parseLocation(mailing_address);

//       // owner occupied
//       const owner_occupied = mailing_address.indexOf(property_address) > -1;
      
//       // property type
//       const property_type_selector  = 'div#datalet_div_1 > table:nth-child(2) > tbody > tr:nth-child(11) > td:nth-child(2)';
//       let property_type = await this.getElementTextContent(page, property_type_selector);
//       if (property_type.indexOf('-') > -1) {
//         property_type = property_type.slice(property_type.indexOf('-')+1).trim();
//       }

//       // sales info
//       await Promise.all([
//         page.click('div#wrapper > div:first-child > nav > div.contentpanel > div:first-child > li:nth-child(14) > a'),
//         page.waitForNavigation()
//       ]);
//       const last_sale_recording_date_selector = 'div#datalet_div_1 > table:nth-child(3) > tbody > tr:first-child > td:nth-child(2)';
//       const last_sale_amount_selector  = 'div#datalet_div_1 > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(2)';
//       const last_sale_recording_date = await this.getElementTextContent(page, last_sale_recording_date_selector);
//       const last_sale_amount = await this.getElementTextContent(page, last_sale_amount_selector);
      
//       // assessed value and est. value
//       await Promise.all([
//         page.click('div#wrapper > div:first-child > nav > div.contentpanel > div:first-child > li:nth-child(2) > a'),
//         page.waitForNavigation()
//       ]);
//       const total_assessed_value_selector = 'div#datalet_div_1 > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(5)';
//       const est_value_selector = 'div#datalet_div_0 > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(5)';
//       const total_assessed_value = await this.getElementTextContent(page, total_assessed_value_selector);
//       const est_value = await this.getElementTextContent(page, est_value_selector);
      
//       return {
//         owner_names, 
//         property_address,
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