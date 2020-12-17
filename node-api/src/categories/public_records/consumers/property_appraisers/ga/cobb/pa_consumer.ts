// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// const parser = require('parse-address');
// const {parseFullName} = require('parse-full-name');

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=1051&LayerID=23951&PageTypeID=2&PageID=9967'
//     }

//     xpaths = {
//         isPAloaded: '//div[@class="modal-dialog"]/div[@class="modal-content"]/div[@class="modal-focus"]/target/div[@class="modal-footer"]/a[1]'
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
//       let street_with_type = (parsed.number ? parsed.number : '') + ' ' + (parsed.prefix ? parsed.prefix : '') + ' ' + parsed.street;
//       street_with_type = street_with_type.trim();

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

//     async getTextByXpathFromPage(page: puppeteer.Page, xPath: string): Promise<string> {
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
//     async parseAndSave(docsToParse: IPublicRecordAttributes[]): Promise<boolean> {
//         console.log(`Documents to look up: ${docsToParse.length}.`);
//         const page = this.browserPages.propertyAppraiserPage;
//         if (page === undefined) return false;
//         page.setDefaultTimeout(60000);

//         // get values of cities option
//         const select_cities = await page.$x('//select[@name="district"]/option');
//         const option_details = [];
//         for (let option_city of select_cities) {
//           const option_detail = await page.evaluate(el => ({value: el.value, city: el.textContent.trim().toUpperCase()}), option_city);
//           option_details.push(option_detail);
//         }
//         let index = 0;
//         for (let document of docsToParse) {
//             this.searchBy = document["Property Address"] ? 'address' : 'name';
//             // do everything that needs to be done for each document here
//             // parse address
//             let address;
//             let search_addr = '';
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
//               address = this.getAddress(document);
//               search_addr = address['street_with_type'].replace(/\s+/g, ' ').trim();
//               console.log(`Looking for address: ${search_addr}`);
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
//                 if (index === 0) {
//                   await page.waitForXPath('//*[text()="Agree"]');
//                   const [agree_button] = await page.$x('//*[text()="Agree"]');
//                   await agree_button.click();
//                   index++;    
//                 }
            
//                 if (this.searchBy === 'name') {
//                   await page.waitForXPath('//input[contains(@id, "_txtName")]');
//                   const inputHandle = await page.$x('//input[contains(@id, "_txtName")]');
//                   await inputHandle[0].type(owner_name, {delay: 150});
//                   await Promise.all([
//                     inputHandle[0].type(String.fromCharCode(13), {delay: 150}),
//                     page.waitForNavigation()
//                   ]);
//                 }
//                 else {
//                   await page.waitForXPath('//input[contains(@id, "_txtAddress")]');
//                   const inputHandle = await page.$x('//input[contains(@id, "_txtAddress")]');
//                   await inputHandle[0].type(search_addr, {delay: 150});
//                   await Promise.all([
//                     inputHandle[0].type(String.fromCharCode(13), {delay: 150}),
//                     page.waitForNavigation()
//                   ]);
//                 }

//                 const noResult = await this.checkExistElement(page, '#ctlBodyPane_noDataList_pnlNoResults_sr');
//                 if (noResult) break;

//                 const isParcelList = await this.checkExistElement(page, '#ctlBodyPane_ctl00_txtResultCount')
//                 if (isParcelList) {
//                   const rows = await page.$x('//*[contains(@id, "_gvwParcelResults")]/tbody/tr');
//                   const datalinks = [];
//                   if (this.searchBy === 'name') {
//                       for (const row of rows) {
//                           const {name, link} = await page.evaluate(el => ({name: el.children[2].textContent.trim(), link: el.children[1].children[0].href}), row);
//                           const regexp = new RegExp(owner_name_regexp);
//                           if (!regexp.exec(name.toUpperCase())) continue;
//                           console.log(name)
//                           datalinks.push(link);
//                       }
//                   }
//                   else {
//                       let link = await page.evaluate(el => el.children[1].children[0].href, rows[0]);
//                       datalinks.push(link);
//                   }

//                   if (datalinks.length === 0) {
//                       console.log("No house found");
//                       break;
//                   }

//                   for (const datalink of datalinks) {
//                     await page.goto(datalink, {waitUntil:'load'});
//                     const result = await this.getPropertyInfos(page, address);
//                     this.parseResult(result, document);
//                   }
//                 }
//                 else {
//                   const result = await this.getPropertyInfos(page, address);
//                   this.parseResult(result, document);
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
//           document['Mailing Care of Name'] = '';
//           document['Mailing Address'] = result['mailing_address'];
//           if (this.searchBy === 'name') {
//             document['Property Address'] = result['property_address'];
//             document['Property State'] = 'GA';
//           }
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
//        // name
//       const nameAsSpan = await this.checkExistElement(page, 'span[id$="_lnkOwnerName1_lblSearch"]');
//       const full_name = nameAsSpan ?
//         await this.getElementTextContent(page, 'span[id$="_lnkOwnerName1_lblSearch"]') :
//         await this.getElementTextContent(page, 'a[id$="_lnkOwnerName1_lnkSearch"]');
//       const owner_names = [];
//       const owner_name_arr = full_name.split('&amp;').map(str => this.simplifyString(str));
//       for (let owner_name_iter of owner_name_arr) {
//         if (owner_name_iter === '') continue;
//         const ownerName = this.parseOwnerName(owner_name_iter);
//         owner_names.push(ownerName);
//       }
//       // property address
//       const property_address_xpath = '//*[text()="Location Address"]/ancestor::tr[1]/td/span';
//       let property_address = await this.getTextByXpathFromPage(page, property_address_xpath);
//       property_address = property_address.replace(/\s+/gm, ' ').trim();

//       // mailing address
//       const street1 = await this.getElementTextContent(page, 'span[id$="_lblAddress1"]');
//       const street2 = await this.getElementTextContent(page, 'span[id$="_lblAddress2"]');
//       const zip = await this.getElementTextContent(page, 'span[id$="_lblCityStZip"]');
//       const mailing_address = (street1 + ' ' + street2 + ' ' + zip).replace(/\s+/gm, ' ').trim();
//       const mailing_address_parsed = parser.parseLocation(mailing_address);
      
//       // owner occupied
//       const owner_occupied = mailing_address.indexOf(property_address) > -1;
      
//       // property type
//       const property_type_selector = '#ctlBodyPane_ctl02_mSection > div table:first-child > tbody > tr:nth-child(3) > td:nth-child(2) > span';
//       const property_type = await this.getElementTextContent(page, property_type_selector);

//       // sales info
//       const last_sale_recording_date_selector = 'table[id$="_gvwSales"] > tbody > tr:first-child > th';
//       const last_sale_amount_selector = 'table[id$="_gvwSales"] > tbody > tr:first-child > td:nth-child(2)';
//       const last_sale_recording_date = await this.getElementTextContent(page, last_sale_recording_date_selector);
//       const last_sale_amount = await this.getElementTextContent(page, last_sale_amount_selector);
      
//       // assessed value and est. value
//       const total_assessed_value_selector = 'table[id$="_gvValuationAsmt"] > tbody > tr > td:nth-child(4)';
//       const est_value_selector = 'table[id$="_gvValuationAppr"] > tbody > tr> td:nth-child(6)';
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