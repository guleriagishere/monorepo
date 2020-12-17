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
//         propertyAppraiserPage: 'https://www.washoecounty.us/assessor/cama/index.php'
//     }

//     xpaths = {
//         isPAloaded: '//input[@id="search_term"]'
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
//         const search_url = 'https://www.washoecounty.us/assessor/cama/index.php';
//         const search_input_selector = '#search_term';
//         const owner_names_xpath = '//th[contains(., "Owner 1")]/parent::tr/td[1]';
//         const mailing_adress_xpath = '//th[contains(., "Mail Address")]/parent::tr/td/text()[2]';
//         const mailing_address_2_xpath = '//th[contains(., "Mail Address")]/parent::tr/td/text()[3]';
//         const total_assessed_value_xpath = '//th[contains(., "Total Assessed")]/ancestor::tbody/tr[2]/td[12]';
//         const property_type_xpath = '//th[contains(., "Building Type")]/parent::tr/td[2]';
//         const last_sale_date_xpath = '//th[contains(., "Doc Date")]/ancestor::tbody/tr[2]/td[5]';
//         const last_sale_amount_xpath = '//th[contains(., "Doc Date")]/ancestor::tbody/tr[2]/td[7]';
//         const property_address_xpath = '//th[contains(., "Situs 1")]/parent::tr/td/text()[1]';
//         const property_address_2_xpath = '//th[contains(., "Situs 1")]/parent::tr/td/text()[2]';

//         const page = this.browserPages.propertyAppraiserPage!;
//         for (let document of docsToParse) {
//             // do everything that needs to be done for each document here
//             let address_input = document["Property Address"];
//             console.log(address_input);
//             address_input = address_input.toLowerCase();
//             const optional_number_address_input = ['apt', 'unit', '#'];
//             for(let o of optional_number_address_input){
//                 address_input = address_input.replace(' '+o,''); // Delete the unit string to optimize the search result
//             }
            
//             await page.goto(search_url, {waitUntil: 'networkidle0'});
//             await page.waitForSelector(search_input_selector, {visible:true});
//             await page.type(search_input_selector, address_input);
//             try{
//                 await page.waitForXPath(owner_names_xpath, {visible:true});
//             } catch {
//                 console.log(address_input, "=> Address not found!");
//                 continue;
//             }
//             let owner_names = await page.evaluate(el => el.textContent, (await page.$x(owner_names_xpath))[0]);

//             let mailing_address, mailing_address_2, total_assessed_value, last_sale_amount, last_sale_date, property_type, property_address, property_address_2;
//             try{
//                 mailing_address = await page.evaluate(el => el.textContent, (await page.$x(mailing_adress_xpath))[0]);
//             } catch {
//                 mailing_address = '';
//             }
//             try {
//                 mailing_address_2 = await page.evaluate(el => el.textContent, (await page.$x(mailing_address_2_xpath))[0]);
//             } catch {
//                 mailing_address_2 = '';
//             }
//             try {
//                 total_assessed_value = await page.evaluate(el => el.textContent, (await page.$x(total_assessed_value_xpath))[0]);
//             } catch {
//                 total_assessed_value;
//             }
//             try {
//                 last_sale_amount = await page.evaluate(el => el.textContent, (await page.$x(last_sale_amount_xpath))[0]);
//             } catch {
//                 last_sale_amount = '';
//             }
//             try {
//                 last_sale_date = await page.evaluate(el => el.textContent, (await page.$x(last_sale_date_xpath))[0]);
//             } catch {
//                 last_sale_date = '';
//             }
//             try {
//                 property_type = await page.evaluate(el => el.textContent, (await page.$x(property_type_xpath))[0]);
//             } catch {
//                 property_type = '';
//             }
//             try {
//                 property_address = await page.evaluate(el => el.textContent, (await page.$x(property_address_xpath))[0]);
//             } catch {
//                 property_address = '';
//             }
//             try {
//                 property_address_2 = await page.evaluate(el => el.textContent, (await page.$x(property_address_2_xpath))[0]);
//             } catch {
//                 property_address_2 = '';
//             }

//             /* Normalize the owner names */
//             let owner_fullname_1, owner_first_1, owner_last_1, owner_middle_1, owner_suffix_1, owner_fullname_2, owner_first_2, owner_last_2, owner_middle_2, owner_suffix_2;
//             let arr_names = owner_names.split(" & ");
//             owner_suffix_1 = this.getSuffix(arr_names[0]);
//             let name_and_type_1 = this.discriminateAndRemove(arr_names[0]);
//             owner_fullname_1 = name_and_type_1.name;
//             let have_2_owners = true;
//             let name_and_type_2;
//             try {
//                 owner_suffix_2 = this.getSuffix(arr_names[1]);
//                 name_and_type_2 = this.discriminateAndRemove(arr_names[1]);
//             } catch {
//                 have_2_owners = false;
//             }
            
//             if (name_and_type_1.type == 'person'){
//                 let owner_1_array = name_and_type_1.name.trim().split(/,\s+/g);
//                 owner_last_1 = owner_1_array ? owner_1_array.shift() : '';
//                 if(owner_1_array.length > 0){
//                     let owner_1_array_2 = owner_1_array[0].trim().split(/\s+/g);
//                     owner_first_1 = owner_1_array_2 ? owner_1_array_2.shift() : '';
//                     owner_middle_1 = owner_1_array_2 ? owner_1_array_2.shift() : '';
//                 } else {
//                     owner_first_1 = '';
//                     owner_middle_1 = '';
//                 }
//             } else {
//                 owner_suffix_1 = '';
//             }
//             if(have_2_owners){
//                 owner_fullname_2 = name_and_type_2.name;
//                 if (name_and_type_2.type == 'person'){
//                     if(owner_fullname_2.includes(',')){
//                         let owner_2_array = name_and_type_2.name.trim().split(/,\s+/g);
//                         owner_first_2 = owner_2_array ? owner_2_array.shift() : '';
//                         if(owner_2_array.length > 0){
//                             let owner_1_array_2 = owner_2_array[0].trim().split(/\s+/g);
//                             owner_last_2 = owner_1_array_2 ? owner_1_array_2.shift() : '';
//                             owner_middle_2 = owner_1_array_2 ? owner_1_array_2.shift() : '';
//                         } else {
//                             owner_last_2 = '';
//                             owner_middle_2 = '';
//                         }
//                     } else {
//                         let owner_2_array = name_and_type_2.name.trim().split(/\s+/g);
//                         owner_first_2 = owner_2_array ? owner_2_array.shift() : '';
//                         owner_last_2 = owner_last_1;
//                         owner_middle_2 = owner_2_array ? owner_2_array.shift() : '';
//                     }
//                 } else {
//                     owner_suffix_2 = '';
//                 }
//             }
//             // owner_last_1 = owner_last_1 ? owner_last_1.replace(",","") : '';
//             // owner_first_2 = owner_first_2 ? owner_first_2.replace(",","") : '';

//             /* Normalize addresses */
//             let mailing_zip, mailing_state, mailing_city;
//             if (mailing_address){
//                 mailing_address = mailing_address.trim();
//                 mailing_address_2 = mailing_address_2.trim();
//                 let mailing_address_2_arr = mailing_address_2.split(/\s+/g);
//                 mailing_zip = mailing_address_2_arr.pop();
//                 mailing_state = mailing_address_2_arr.pop();
//                 mailing_city = '';
//                 for(let m of mailing_address_2_arr){
//                     mailing_city += m + " ";
//                 }
//                 mailing_city = mailing_city.trim();
//             } else {
//                 mailing_zip = '';
//                 mailing_state = '';
//                 mailing_city = '';
//             }
//             let property_zip, property_state, property_city;
//             if (property_address){
//                 property_address = property_address.trim();
//                 property_address_2 = property_address_2.trim();
//                 let property_address_2_arr = property_address_2.split(/\s+/g);
//                 property_zip = property_address_2_arr.pop();
//                 property_state = property_address_2_arr.pop();
//                 property_city = '';
//                 for(let m of property_address_2_arr){
//                     property_city += m + " ";
//                 }
//                 property_city = property_city.trim();
//             } else {
//                 property_zip = '';
//                 property_state = '';
//                 property_city = '';
//             }

//             // Owner Occupied
//             let owner_occupied = false;
//             if (mailing_address && property_address){
//                 if(mailing_state == property_state && mailing_zip == property_zip){
//                     let arr_property_address = property_address.toLowerCase().split(" ");
//                     let arr_mailing_address = mailing_address.toLowerCase().split(" ");
//                     let count_matches = 0;
//                     for(let val1 of arr_property_address){
//                         for(let val2 of arr_mailing_address){
//                             if (val1 == val2){
//                                 count_matches += 1;
//                             }
//                         }
//                     }
//                     if(arr_property_address[0] == arr_mailing_address[0] && count_matches >= 2){
//                         owner_occupied = true;
//                     }
//                 }
//             }

//             document['Owner Occupied'] = owner_occupied;
//             document['Full Name'] = owner_fullname_1 ? owner_fullname_1.trim() : '';
//             document['First Name'] = owner_first_1 ? owner_first_1 : '';
//             document['Last Name'] = owner_last_1 ? owner_last_1 : '';
//             document['Middle Name'] = owner_middle_1 ? owner_middle_1 : '';
//             document['Name Suffix'] = owner_suffix_1 ? owner_suffix_1 : '';
//             document['Mailing Care of Name'] = '';
//             document['Mailing Address'] = mailing_address;
//             document['Mailing Unit #'] = '';
//             document['Mailing City'] = mailing_city;
//             document['Mailing State'] = mailing_state;
//             document['Mailing Zip'] = mailing_zip;
//             document['Property Type'] = property_type.trim();
//             document['Total Assessed Value'] = total_assessed_value.trim();
//             document['Last Sale Recording Date'] = last_sale_date.trim();
//             document['Last Sale Amount'] = last_sale_amount.trim();
//             document['Est. Remaining balance of Open Loans'] = '';
//             document['Est Value'] = '';
//             document['Effective Year Built'] = '';
//             document['Est Equity'] = '';
//             document['Lien Amount'] = '';
//             await document.save();
//             console.log(document);

//             if(have_2_owners){
//                 let newDocument = await this.cloneMongoDocument(document);
//                 newDocument['Full Name'] = owner_fullname_2 ? owner_fullname_2.trim() : '';
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