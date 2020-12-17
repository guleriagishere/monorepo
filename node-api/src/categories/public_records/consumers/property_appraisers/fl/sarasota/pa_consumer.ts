// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// var parser = require('parse-address'); 


// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://www.sc-pa.com/propertysearch'
//     }

//     xpaths = {
//         isPAloaded: '//footer[@class="site-footer"]'
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     discriminateAndRemove(name: string) : any {
//         const companyIdentifiersArray = [ 'GENERAL', 'TRUSTEE', 'TRUSTEES', 'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'OF' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENTS', 'HOLDINGS', 'ESTATE', 'LLP', 'LP', 'TRUST', 'LOAN', 'CONDOMINIUM', 'CHURCH', 'CITY', 'CATHOLIC', 'D/B/A', 'COCA COLA', 'LTD', 'CLINIC', 'TODAY', 'PAY', 'CLEANING', 'COSMETIC', 'CLEANERS', 'FURNITURE', 'DECOR', 'FRIDAY HOMES', 'SAVINGS', 'PROPERTY', 'PROTECTION', 'ASSET', 'SERVICES', 'L L C', 'NATIONAL', 'ASSOCIATION', 'MANAGEMENT', 'PARAGON', 'MORTGAGE', 'CHOICE', 'PROPERTIES', 'J T C', 'RESIDENTIAL', 'OPPORTUNITIES', 'FUND', 'LEGACY', 'SERIES', 'HOMES', 'LOAN'];
//         const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.', '&'];
//         const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
//         const removeFromNameRegexString = `^(.*?)\\b(?:${removeFromNamesArray.join('|')})\\b.*?$`;
//         const companyRegex = new RegExp(companyRegexString, 'i');
//         const removeFromNamesRegex = new RegExp(removeFromNameRegexString, 'i');
//         let isCompanyName = name.match(companyRegex);
//         if (isCompanyName) {
//             return {
//                 type: 'company',
//                 name: name
//             }
//         }
        
//         let cleanName = name.match(removeFromNamesRegex);
//         if (cleanName) {
//             name = cleanName[1];
//         }
//         return {
//             type: 'person',
//             name: name
//         }
//     }

//     sleep(ms: number) : any {
//         return new Promise(resolve => setTimeout(resolve, ms));
//     }

//     getSuffix(name: string) : any {
//         const suffixList = ['esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.'];
//         name = name.toLowerCase();
//         for(let suffix of suffixList){
//             let regex = new RegExp(' '+suffix, 'gm');
//             if (name.match(regex)){
//                 return suffix;
//             }
//         }
//         return '';
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

//         const page = this.browserPages.propertyAppraiserPage!;
//         const url_search = 'https://www.sc-pa.com/propertysearch';
//         for (let document of docsToParse) {
//             // let docToSave: any = await this.getLineItemObject(document);
//             if (!this.decideSearchByV2(document)) {
//                 console.log('Insufficient info for Owner and Property');
//                 continue;
//             }
//             // do everything that needs to be done for each document here
//             let address_input = '';
//             let address_input_lower = '';
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             var owner_name_regexp = '';

//             if (this.searchBy === 'name') {
//                 const nameInfo = this.getNameInfo(document.ownerId);
//                 first_name = nameInfo.first_name;
//                 last_name = nameInfo.last_name;
//                 owner_name = nameInfo.owner_name;
//                 owner_name_regexp = nameInfo.owner_name_regexp;
//                 if (owner_name === '') continue;
//                 console.log(`Looking for owner: ${owner_name}`);

//             }
//             else {
//                 address_input = document.propertyId["Property Address"];
//                 console.log(`Looking for address: ${address_input}`);
//             }

//             let retry_count = 0;
//             while (true){
//                 if (retry_count > 15){
//                     console.error('Connection/website error for 15 iteration.');
//                     this.browser?.close();
//                     return false;
//                 }
//                 try{
//                     await page.goto(url_search);
//                     if (this.searchBy === 'name') {
//                         await page.$eval('input[name="OwnerKeywords"]', (el:any, value:any) => el.value = value, owner_name); // Send keys
//                     }
//                     else {
//                         address_input_lower = address_input.toLowerCase();
//                         await page.waitFor('.site-footer', {visible: true});
//                         await page.$eval('input[name="AddressKeywords"]', (el:any, value:any) => el.value = value, address_input); // Send keys
//                     }
//                     await page.click('input[name="search"]');
//                     await page.waitFor('.site-footer', {visible: true});
//                     let current_url = page.url();
//                     let pattern_parcel = /propertysearch\/parcel\/details/gm;
//                     let found = false;
//                     if (current_url.match(pattern_parcel)){
//                         await this.getData(page, document, address_input);
//                     } else {
//                         let go_next_page = true;
//                         while (go_next_page){
//                             const datalinks = [];
//                             if (this.searchBy === 'name') {
//                                 await page.waitForXPath('//a[text()="1000"]');
//                                 const pagination1000 = await page.$x('//a[text()="1000"]');
//                                 await Promise.all([
//                                     pagination1000[0].click(),
//                                     page.waitForNavigation()
//                                 ]);
//                                 const results = await page.$$('div.resultl');
//                                 const linkhandles = await page.$$('span.reg > a');
//                                 let index = 0;
//                                 for (const result of results) {
//                                     const text = await page.evaluate(el => el.textContent, result);
//                                     const regexp = new RegExp(owner_name_regexp);
//                                     if (!regexp.exec(text.toUpperCase())) continue;
//                                     const datalink = await page.evaluate(el => el.href, linkhandles[index]);
//                                     datalinks.push(datalink);
//                                     index++;
//                                 }
//                             }
//                             else {
//                                 let property_addresses_xpath = await page.$x('//*[@class="reg"]/a');
//                                 for(let i = 0; i < property_addresses_xpath.length; i++){
//                                     let property_address = await page.evaluate(el => el.textContent, property_addresses_xpath[i]);
//                                     property_address = property_address.trim().toLowerCase();
//                                     let regex_address = new RegExp('^'+address_input_lower, 'g');
//                                     if (property_address.match(regex_address)){
//                                         found = true;
//                                         go_next_page = false;
//                                         let property_addresses_xpath_2 = await page.$x('//*[@class="reg"]/a');
//                                         const datalink = await page.evaluate(el => el.href, property_addresses_xpath_2[0]);
//                                         datalinks.push(datalink);
//                                         break;
//                                     }
//                                 }
//                             }

//                             if (datalinks.length > 0) {
//                                 for (const datalink of datalinks) {
//                                     await Promise.all([
//                                         page.goto(datalink, {waitUntil: 'load'}),
//                                         page.waitFor('.site-footer', {visible: true})
//                                     ]);
//                                     await this.getData(page, document, address_input);
//                                 }
//                             }
//                             else {
//                                 if (this.searchBy === 'name')
//                                     console.log(owner_name, "=> Owner not found!");
//                                 else
//                                     console.log(address_input, "=> Address not found!");
//                             }
//                             break;
//                         }
//                     }                   
//                     break;
//                 } catch (error){
//                     console.log('^^^^^^^^^^^^^^^^^^^')
//                     console.error(error);
//                     let power = Math.pow(2, retry_count + 1);
//                     let duration = (power - 1) * 1001;
//                     this.sleep(duration);
//                     retry_count += 1;
//                 }
//             }
//         }
//         return true;
//     }

//     async getData(page: puppeteer.Page, document: any, address_input: string) {
//         await page.waitForXPath('//li[contains(., "Ownership")]/parent::ul/li', {visible:true})
//         let ownership_row = await page.$x('//li[contains(., "Ownership")]/parent::ul/li');
//         let have_2_owners = false;
//         if (ownership_row.length == 7){
//             have_2_owners = true;
//         }
//         let mailing_address_row = ownership_row.length - 3;
//         await page.waitForXPath('//li[contains(., "Ownership")]/parent::ul/li[2]', {visible:true})
//         let owner_fullname_1, owner_fullname_2, mailing_address_combined;
//         let owner_fullname_1_xpath = await page.$x('//li[contains(., "Ownership")]/parent::ul/li[2]');
//         owner_fullname_1 = await page.evaluate(el => el.textContent, owner_fullname_1_xpath[0]);
        
//         if(have_2_owners){
//             await page.waitForXPath('//li[contains(., "Ownership")]/parent::ul/li[3]', {visible:true})
//             await page.waitForXPath('//li[contains(., "Ownership")]/parent::ul/li[4]', {visible:true})
//             let owner_fullname_2_xpath = await page.$x('//li[contains(., "Ownership")]/parent::ul/li[3]');
//             owner_fullname_2 = await page.evaluate(el => el.textContent, owner_fullname_2_xpath[0]);
//             let mailing_address_combined_xpath = await page.$x('//li[contains(., "Ownership")]/parent::ul/li['+mailing_address_row+']');
//             mailing_address_combined = await page.evaluate(el => el.textContent, mailing_address_combined_xpath[0]);
//         } else {
//             await page.waitForXPath('//li[contains(., "Ownership")]/parent::ul/li[3]', {visible:true})
//             owner_fullname_2 = '';
//             let mailing_address_combined_xpath = await page.$x('//li[contains(., "Ownership")]/parent::ul/li['+mailing_address_row+']');
//             mailing_address_combined = await page.evaluate(el => el.textContent, mailing_address_combined_xpath[0]);
//         }

//         await page.waitForXPath('//li[text()="Situs Address:"]/following-sibling::li/text()', {visible: true});
//         let property_address_xpath = await page.$x('//li[text()="Situs Address:"]/following-sibling::li/text()');
//         let property_address = await page.evaluate(el => el.textContent, property_address_xpath[0]);
//         let property_address_parsed = parser.parseLocation(property_address);
//         property_address = 
//             ((property_address_parsed['number'] ? property_address_parsed['number'] + ' ' : '') +
//             (property_address_parsed['prefix'] ? property_address_parsed['prefix'] + ' ' : '') +
//             (property_address_parsed['street'] ? property_address_parsed['street'] + ' ' : '') +
//             (property_address_parsed['type'] ? property_address_parsed['type'] : '')).trim();

//         await page.waitForXPath('//li[contains(., "Property Use")]/text()', {visible:true})
//         let property_type_xpath = await page.$x('//li[contains(., "Property Use")]/text()');
//         let property_type_str = await page.evaluate(el => el.textContent, property_type_xpath[0]);
//         let property_type_arr = property_type_str.split(" - ");
//         let property_type = property_type_arr[1];

//         await page.waitForXPath('//th[contains(.,"Assessed")]/ancestor::table/tbody/tr[1]/td[6]', {visible:true})
//         let total_assessed_value_xpath = await page.$x('//th[contains(.,"Assessed")]/ancestor::table/tbody/tr[1]/td[6]');
//         let total_assessed_value = await page.evaluate(el => el.textContent, total_assessed_value_xpath[0]);

//         await page.waitForXPath('//th[contains(.,"Assessed")]/ancestor::table/tbody/tr[1]/td[5]', {visible:true})
//         let est_value_xpath = await page.$x('//th[contains(.,"Assessed")]/ancestor::table/tbody/tr[1]/td[5]');
//         let est_value = await page.evaluate(el => el.textContent, est_value_xpath[0]);

//         let last_sale_date;
//         try{
//             await page.waitForXPath('//th[contains(.,"Transfer Date")]/ancestor::table/tbody/tr[1]/td[1]', {visible:true})
//             let last_sale_xpath = await page.$x('//th[contains(.,"Transfer Date")]/ancestor::table/tbody/tr[1]/td[1]');
//             last_sale_date = await page.evaluate(el => el.textContent, last_sale_xpath[0]);
//         } catch {
//             last_sale_date = '';
//         }

//         let last_sale_amount;
//         try{
//             await page.waitForXPath('//th[contains(.,"Transfer Date")]/ancestor::table/tbody/tr[1]/td[2]', {visible:true})
//             let last_sale_amount_xpath = await page.$x('//th[contains(.,"Transfer Date")]/ancestor::table/tbody/tr[1]/td[2]');
//             last_sale_amount = await page.evaluate(el => el.textContent, last_sale_amount_xpath[0]);
//         } catch{
//             last_sale_amount = '';
//         }

//         /* Normalize the name */
//         let owner_first_1, owner_last_1, owner_middle_1, owner_suffix_1, owner_fullname_1_fix, owner_first_2, owner_last_2, owner_middle_2, owner_suffix_2, owner_fullname_2_fix;
//         owner_suffix_1 = this.getSuffix(owner_fullname_1.trim());
//         owner_fullname_1 = this.discriminateAndRemove(owner_fullname_1);
//         owner_fullname_1_fix = owner_fullname_1.name;
//         /* First owner */
//         if(owner_fullname_1.type == 'person'){
//             let owner_1_array = owner_fullname_1.name.split(" ");
//             owner_last_1 = owner_1_array ? owner_1_array.shift() : '';
//             owner_first_1 = owner_1_array ? owner_1_array.shift() : '';
//             owner_middle_1 = owner_1_array ? owner_1_array.shift() : '';
//         } else {
//             owner_last_1 = '';
//             owner_first_1 = '';
//             owner_middle_1 = '';
//             owner_suffix_1 = '';
//         }
//         /* Second owner */
//         if(have_2_owners){
//             owner_suffix_2 = this.getSuffix(owner_fullname_2.trim());
//             owner_fullname_2 = this.discriminateAndRemove(owner_fullname_2);
//             owner_fullname_2_fix = owner_fullname_2.name;
//             if (owner_fullname_2.type == 'person'){
//                 let owner_2_array = owner_fullname_2.name.split(" ");
//                 owner_last_2 = owner_2_array ? owner_2_array.shift() : '';
//                 owner_first_2 = owner_2_array ? owner_2_array.shift() : '';
//                 owner_middle_2 = owner_2_array ? owner_2_array.shift() : '';
//             } else {
//                 owner_last_2 = '';
//                 owner_first_2 = '';
//                 owner_middle_2 = '';
//                 owner_suffix_2 = '';
//             }
//         } else {
//             owner_fullname_2_fix = '';
//             owner_last_2 = '';
//             owner_first_2 = '';
//             owner_middle_2 = '';
//             owner_suffix_2 = '';
//         }

//         /* Normalize the mailing address */
//         let mailing_address, mailing_city, mailing_state, mailing_zip;
//         mailing_address_combined = mailing_address_combined.trim();
//         let mailing_address_arr = mailing_address_combined.split(", ");
//         mailing_address = mailing_address_arr[0].replace("\n\n", " ");
//         mailing_city = mailing_address_arr[1];
//         mailing_state = mailing_address_arr[2];
//         mailing_zip = mailing_address_arr[3];

//         // Owner Occupied
//         let owner_occupied = false;
//         if(mailing_state == 'FL'){
//             let arr_property_address = address_input.trim().toLowerCase().split(" ");
//             let arr_mailing_address = mailing_address.trim().toLowerCase().split(" ");
//             let count_matches = 0;
//             for(let val1 of arr_property_address){
//                 for(let val2 of arr_mailing_address){
//                     if (val1 == val2){
//                         count_matches += 1;
//                     }
//                 }
//             }
//             if(arr_property_address[0] == arr_mailing_address[0] && count_matches >= 2){
//                 owner_occupied = true;
//             }
//         }

//         let dataFromPropertyAppraisers: any = {};
//         dataFromPropertyAppraisers['Owner Occupied'] = owner_occupied;
//         dataFromPropertyAppraisers['Full Name'] = owner_fullname_1_fix ? owner_fullname_1_fix.trim() : '';
//         dataFromPropertyAppraisers['First Name'] = owner_first_1 ? owner_first_1 : '';
//         dataFromPropertyAppraisers['Last Name'] = owner_last_1 ? owner_last_1 : '';
//         dataFromPropertyAppraisers['Middle Name'] = owner_middle_1 ? owner_middle_1 : '';
//         dataFromPropertyAppraisers['Name Suffix'] = owner_suffix_1 ? owner_suffix_1 : '';
//         dataFromPropertyAppraisers['Mailing Care of Name'] = '';
//         dataFromPropertyAppraisers['Mailing Address'] = mailing_address.trim();
//         dataFromPropertyAppraisers['Mailing Unit #'] = '';
//         dataFromPropertyAppraisers['Mailing City'] = mailing_city.trim();
//         dataFromPropertyAppraisers['Mailing State'] = mailing_state;
//         dataFromPropertyAppraisers['Mailing Zip'] = mailing_zip ? mailing_zip : '';
//         dataFromPropertyAppraisers['Property Type'] = property_type.trim();
//         dataFromPropertyAppraisers['Total Assessed Value'] = total_assessed_value.trim();
//         dataFromPropertyAppraisers['Last Sale Recording Date'] = last_sale_date.trim();
//         dataFromPropertyAppraisers['Last Sale Amount'] = last_sale_amount.trim();
//         dataFromPropertyAppraisers['Est. Remaining balance of Open Loans'] = '';
//         dataFromPropertyAppraisers['Est Value'] = est_value.trim();
//         dataFromPropertyAppraisers['Effective Year Built'] = '';
//         dataFromPropertyAppraisers['Est Equity'] = '';
//         dataFromPropertyAppraisers['Lien Amount'] = '';
//         // if (this.searchBy === 'name') {
//             dataFromPropertyAppraisers['Property Address'] = property_address;
//             dataFromPropertyAppraisers['Property City'] = property_address_parsed.city;
//             dataFromPropertyAppraisers['Property State'] = "FL";
//             dataFromPropertyAppraisers['Property Zip'] = property_address_parsed.zip;
//             dataFromPropertyAppraisers['County'] = "Sarasota";
//         // }
//         // console.log(document);
// 		// await this.saveToLineItem(document);
//         // await this.saveToOwnerProductProperty(document);
//         await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
//         // if(have_2_owners){
//         //     let newDocument = await this.cloneDocument(document);
//         //     newDocument['Full Name'] = owner_fullname_2_fix ? owner_fullname_2_fix.trim() : '';
//         //     newDocument['First Name'] = owner_first_2 ? owner_first_2 : '';
//         //     newDocument['Last Name'] = owner_last_2 ? owner_last_2 : '';
//         //     newDocument['Middle Name'] = owner_middle_2 ? owner_middle_2 : '';
//         //     newDocument['Name Suffix'] = owner_suffix_2 ? owner_suffix_2 : '';
//         //     console.log(newDocument);
//         //     await this.saveToLineItem(newDocument);
//         //     await this.saveToOwnerProductProperty(newDocument);
//         // }
//     }
// }