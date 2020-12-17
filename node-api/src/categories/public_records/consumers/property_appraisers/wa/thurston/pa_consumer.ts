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
//         propertyAppraiserPage: 'https://tcproperty.co.thurston.wa.us/propsql/front.asp'
//     }

//     xpaths = {
//         isPAloaded: '//p[contains(@class, "big_left")]'
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
        
//         const url_search = 'https://tcproperty.co.thurston.wa.us/propsql/front.asp';
//         /* XPath & Selector Configurations */
//         const accept_tos_xpath = '//input[@value="I Accept"]';
//         const street_number_selector = 'input[name="fa"]';
//         const street_name_selector = 'input[name="sn"]';
//         const search_button_xpath = '//input[@value="Submit"]';
//         const property_detail_button_xpath = '//th[contains(., "Property Number")]/ancestor::tbody/tr[2]/td[5]/a[2]';
//         const owner_names_xpath = '//td[contains(., "Owner:") and contains(@class, "emphatic")]/parent::tr/td[2]';
//         const mailing_address_xpath = '//td[contains(., "Owner:") and contains(@class, "emphatic")]/ancestor::tbody/tr[6]/td[2]';
//         const mailing_address_2_xpath = '//td[contains(., "Owner:") and contains(@class, "emphatic")]/ancestor::tbody/tr[7]/td[2]';
//         const est_value_xpath = '//td[contains(., "Market Value Total") and contains(@class, "emphatic")]/parent::tr/td[2]';
//         const property_type_xpath = '//td[contains(., "Property Type:") and contains(@class, "emphatic")]/parent::tr/td[2]';
//         const last_sale_date_xpath = '//td[contains(., "Sale Date:") and contains(@class, "emphatic")]/parent::tr/td[2]';
//         const last_sale_amount_xpath = '//td[contains(., "Price:") and contains(@class, "emphatic")]/parent::tr/td[2]';

//         const page = this.browserPages.propertyAppraiserPage!;
//         await page.goto(url_search, {waitUntil: 'networkidle0'});
//         try{
//             let accept_tos = await page.$x(accept_tos_xpath);
//             await accept_tos[0].click();
//         } catch {
//             // Pass
//         }

//         for (let document of docsToParse) {
//             // do everything that needs to be done for each document here
//             let address_input = document["Property Address"];
//             console.log(address_input);
//             let parser = parseaddress.parseLocation(address_input);
//             await page.goto(url_search, {waitUntil: 'networkidle0'});
//             await page.waitForSelector(street_number_selector, {visible:true});
//             await page.type(street_number_selector, parser.number);
//             await page.type(street_name_selector, parser.street);
//             let search_button = await page.$x(search_button_xpath);
//             await search_button[0].click();
//             await page.waitForNavigation();
//             let property_detail_button = await page.$x(property_detail_button_xpath);
//             const newPagePromise = new Promise(x => this.browser?.once('targetcreated', target => x(target.page()))); // Promise to handle a new page
//             await property_detail_button[0].click();
//             const page2:any = await newPagePromise;
//             await page2.bringToFront();
//             await page2.waitForXPath(owner_names_xpath, {visible: true});

//             let owner_names = await page2.evaluate((el: any) => el.textContent, (await page2.$x(owner_names_xpath))[0]);

//             let mailing_address, mailing_address_2, est_value, property_type;
//             try{
//                 mailing_address = await page2.evaluate((el: any) => el.textContent, (await page2.$x(mailing_address_xpath))[0]);
//             } catch {
//                 mailing_address = '';
//             }
//             try{
//                 mailing_address_2 = await page2.evaluate((el: any) => el.textContent, (await page2.$x(mailing_address_2_xpath))[0]);
//             } catch {
//                 mailing_address_2 = '';
//             }
//             try{
//                 est_value = await page2.evaluate((el: any) => el.textContent, (await page2.$x(est_value_xpath))[0]);
//             } catch {
//                 est_value = '';
//             }
//             try{
//                 property_type = await page2.evaluate((el: any) => el.textContent, (await page2.$x(property_type_xpath))[0]);
//             } catch {
//                 property_type = '';
//             }
//             let last_sale_amount, last_sale_date;
//             try{
//                 last_sale_date = await page2.evaluate((el: any) => el.textContent, (await page2.$x(last_sale_date_xpath))[0]);
//             } catch {
//                 last_sale_date = '';
//             }
//             try{
//                 last_sale_amount = await page2.evaluate((el: any) => el.textContent, (await page2.$x(last_sale_amount_xpath))[0]);
//             } catch {
//                 last_sale_amount = '';
//             }
//             await page2.close();

//             // Normalize the owner's name
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
//             owner_last_1 = owner_last_1 ? owner_last_1.replace(",","") : '';
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

//             // Normalize the mailing address
//             let mailing_city = '';
//             let mailing_state = '';
//             let mailing_zip = '';
//             if (mailing_address_2 != ''){
//                 let mailing_address_2_arr = mailing_address_2.split(", ");
//                 mailing_city = mailing_address_2_arr[0];
//                 let mailing_state_zip = mailing_address_2_arr[1];
//                 let mailing_state_zip_arr = mailing_state_zip.split(/\s+/g);
//                 mailing_state = mailing_state_zip_arr[0];
//                 mailing_zip = mailing_state_zip_arr[1];
//             } 

//             // Owner Occupied
//             let owner_occupied = false;
//             if(mailing_address != ''){
//                 if(mailing_state.trim() == 'WA'){
//                     let arr_property_address = address_input.toLowerCase().split(" ");
//                     let arr_mailing_address = mailing_address.trim().toLowerCase().split(" ");
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
//             document['Full Name'] = owner_fullname_1 ? owner_fullname_1 : '';
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
//             document['Property Type'] = property_type;
//             document['Total Assessed Value'] = '';
//             document['Last Sale Recording Date'] = last_sale_date;
//             document['Last Sale Amount'] = last_sale_amount;
//             document['Est. Remaining balance of Open Loans'] = '';
//             document['Est Value'] = est_value;
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