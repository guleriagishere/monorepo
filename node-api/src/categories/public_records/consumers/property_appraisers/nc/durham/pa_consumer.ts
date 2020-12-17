// import puppeteer from 'puppeteer';
// const parseaddress = require('parse-address');
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'


// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://property.spatialest.com/nc/durham/#/'
//     }

//     xpaths = {
//         isPAloaded: '//div[contains(@class, "disclaimer")]'
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
//     async parseAndSave(docsToParse: IPublicRecordAttributes[]): Promise<boolean> {
//         console.log(`Documents to look up: ${docsToParse.length}.`);

//         /* XPath & Selector Configurations */
//         const search_input_selector = 'input[id="primary_search"]'; // Search Input Field
//         const search_button_selector= 'button[title="Submit search query"]'; // Search Button
//         const footer_selector = '.disclaimer'; // Footer to ensure all element loaded

//         const mailing_rows_xpath = '//div[contains(@class, "mailing")]//div[contains(@class, "value")]/text()';
//         const last_sale_date_xpath = '//p[./span[contains(., "Last Sale Date")]]/span[2]';
//         const last_sale_amount_xpath = '//p[./span[contains(., "Last Sale Price")]]/span[2]';
//         const property_type_xpath = '//p[./span[contains(., "Land Use Desc")]]/span[2]';
//         const est_value_xpath = '//p[./span[contains(., "Total Fair Market Value")]]/span[2]';
//         const total_assessed_value_xpath = '//div[contains(@class, "valuation")]//span[contains(@class, "value")]';
//         const year_built_xpath = '//p[./span[contains(., "Year Built")]]/span[2]';

//         const page = this.browserPages.propertyAppraiserPage!;
//         const url_search = 'https://property.spatialest.com/nc/durham/#/';
//         for (let doc of docsToParse) {
//             // do everything that needs to be done for each document here
//             let address_input = doc["Property Address"];
//             console.log(address_input);
//             await page.goto(url_search);
//             await page.waitForSelector(footer_selector, {visible: true});
//             await page.evaluate( () => (<HTMLInputElement>document.getElementById("primary_search")).value = "")
//             await page.waitFor(2000);
//             await page.type(search_input_selector, address_input);
//             // await page.$eval(search_input_selector, (el, value) => el.value = value, address_input); // Send keys
//             await page.waitFor(1000);
//             await page.click(search_button_selector);
//             await page.waitForSelector(footer_selector, {visible: true});

//             try{
//                 await page.waitForXPath(mailing_rows_xpath, {visible: true, timeout:6000});
//             } catch {
//                 console.log(address_input, "=> Address not found!");
//                 continue;
//             }
//             let mailing_rows = await page.$x(mailing_rows_xpath);

//             let mailing_address = '';
//             let mailing_rows_data = [];
//             let index_address = 1;
//             for(let i = 1; i < mailing_rows.length + 1; i++){
//                 let p_data = await page.evaluate(el => el.textContent, (await page.$x(mailing_rows_xpath+"["+i+"]"))[0]);
//                 mailing_rows_data.push(p_data);
//                 let parse_addr = parseaddress.parseLocation(p_data);
//                 try {
//                     if (parse_addr.number){
//                         mailing_address = p_data;
//                         index_address = i - 1;
//                     }
//                 } catch {
//                     // pass
//                 }
//             }
//             let owner_name_1 = mailing_rows_data[0];
//             let mailing_address_2 = mailing_rows_data[mailing_rows_data.length - 1];
//             let have_two_owners = false;
//             let owner_name_2 = ''
//             if(mailing_rows.length > 3 && index_address != 1){
//                 have_two_owners = true;
//                 owner_name_2 = mailing_rows_data[1];
//             }

//             let property_type, last_sale_date, est_value, total_assessed_value, last_sale_amount, year_built;

//             try{
//                 property_type = await page.evaluate(el => el.textContent, (await page.$x(property_type_xpath))[0]);
//             } catch {
//                 property_type = '';
//             }
//             try{
//                 last_sale_date = await page.evaluate(el => el.textContent, (await page.$x(last_sale_date_xpath))[0]);
//             } catch {
//                 last_sale_date = '';
//             }
//             try{
//                 est_value = await page.evaluate(el => el.textContent, (await page.$x(est_value_xpath))[0]);
//             } catch {
//                 est_value = '';
//             }
//             try{
//                 total_assessed_value = await page.evaluate(el => el.textContent, (await page.$x(total_assessed_value_xpath))[0]);
//             } catch {
//                 total_assessed_value = '';
//             }
//             try{
//                 last_sale_amount = await page.evaluate(el => el.textContent, (await page.$x(last_sale_amount_xpath))[0]);
//             } catch {
//                 last_sale_amount = '';
//             }
//             try{
//                 year_built = await page.evaluate(el => el.textContent, (await page.$x(year_built_xpath))[0]);
//             } catch {
//                 year_built = '';
//             }

//             let mailing_address_2_arr = mailing_address_2.split(", ");
//             let mailing_city = mailing_address_2_arr[0];
//             let mailing_state = mailing_address_2_arr[1];
//             let mailing_zip = mailing_address_2_arr[2];

//             /* Normalize the name */
//             let owner_fullname_1, owner_first_1, owner_last_1, owner_middle_1, owner_suffix_1, owner_fullname_2, owner_first_2, owner_last_2, owner_middle_2, owner_suffix_2;
//             owner_suffix_1 = this.getSuffix(owner_name_1);
//             let name_and_type_1 = this.discriminateAndRemove(owner_name_1);
//             owner_fullname_1 = name_and_type_1.name;
//             let name_and_type_2;
//             if(have_two_owners){
//                 owner_suffix_2 = this.getSuffix(owner_name_2);
//                 name_and_type_2 = this.discriminateAndRemove(owner_name_2);
//             }
//             if (name_and_type_1.type == 'person'){
//                 let owner_1_array = name_and_type_1.name.split(" ");
//                 owner_last_1 = owner_1_array ? owner_1_array.shift() : '';
//                 owner_first_1 = owner_1_array ? owner_1_array.shift() : '';
//                 owner_middle_1 = owner_1_array ? owner_1_array.shift() : '';
//             } else {
//                 owner_suffix_1 = '';
//             }
//             if(have_two_owners){
//                 owner_fullname_2 = name_and_type_2.name;
//                 if (name_and_type_2.type == 'person'){
//                     let owner_2_array = name_and_type_2.name.split(" ");
//                     owner_last_2 = owner_2_array ? owner_2_array.shift() : '';
//                     owner_first_2 = owner_2_array ? owner_2_array.shift() : '';
//                     owner_middle_2 = owner_2_array ? owner_2_array.shift() : '';
//                 } else {
//                     owner_suffix_2 = '';
//                 }
//             }

//             // Owner Occupied
//             let owner_occupied = false;
//             if(mailing_state == 'NC'){
//                 let arr_property_address = address_input.toLowerCase().split(" ");
//                 let arr_mailing_address = mailing_address.toLowerCase().split(" ");
//                 let count_matches = 0;
//                 for(let val1 of arr_property_address){
//                     for(let val2 of arr_mailing_address){
//                         if (val1 == val2){
//                             count_matches += 1;
//                         }
//                     }
//                 }
//                 if(arr_property_address[0] == arr_mailing_address[0] && count_matches >= 2){
//                     owner_occupied = true;
//                 }
//             }
//             doc['Owner Occupied'] = owner_occupied;
//             doc['Full Name'] = owner_fullname_1 ? owner_fullname_1.trim() : '';
//             doc['First Name'] = owner_first_1 ? owner_first_1 : '';
//             doc['Last Name'] = owner_last_1 ? owner_last_1 : '';
//             doc['Middle Name'] = owner_middle_1 ? owner_middle_1 : '';
//             doc['Name Suffix'] = owner_suffix_1 ? owner_suffix_1 : '';
//             doc['Mailing Care of Name'] = '';
//             doc['Mailing Address'] = mailing_address.trim();
//             doc['Mailing Unit #'] = '';
//             doc['Mailing City'] = mailing_city;
//             doc['Mailing State'] = mailing_state;
//             doc['Mailing Zip'] = mailing_zip;
//             doc['Property Type'] = property_type;
//             doc['Total Assessed Value'] = total_assessed_value;
//             doc['Last Sale Recording Date'] = last_sale_date;
//             doc['Last Sale Amount'] = last_sale_amount;
//             doc['Est. Remaining balance of Open Loans'] = '';
//             doc['Est Value'] = est_value;
//             doc['Effective Year Built'] = year_built;
//             doc['Est Equity'] = '';
//             doc['Lien Amount'] = '';
//             await doc.save();
//             console.log(doc);

//             if(have_two_owners){
//                 let newDocument = await this.cloneMongoDocument(doc);
//                 newDocument['Full Name'] = owner_fullname_2 ? owner_fullname_2 : '';
//                 newDocument['First Name'] = owner_first_2 ? owner_first_2 : '';
//                 newDocument['Last Name'] = owner_last_2 ? owner_last_2 : '';
//                 newDocument['Middle Name'] = owner_middle_2 ? owner_middle_2 : '';
//                 newDocument['Name Suffix'] = owner_suffix_2 ? owner_suffix_2 : '';
//                 await newDocument.save();
//                 console.log(newDocument);
//             }
//         }
//         return true;
//     }
// }