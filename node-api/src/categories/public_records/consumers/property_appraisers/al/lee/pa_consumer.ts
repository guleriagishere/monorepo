// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// import { first } from 'lodash';


// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'http://www.deltacomputersystems.com/AL/AL43/pappraisala.html'
//     }

//     xpaths = {
//         isPAloaded: '//input[@name="HTMADDRNUMBER"]'
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

//         const page = this.browserPages.propertyAppraiserPage!;
//         for (let document of docsToParse) {
//             this.searchBy = document["Property Address"] ? 'address' : 'name';
//             // do everything that needs to be done for each document here
//             let address_input = '';
//             let address_input_lower = '';
//             let address_no:string|undefined = '';
//             let address_street = '';
            
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';

//            if (this.searchBy === 'name') {
//                 const nameInfo = this.getNameInfo(document);
//                 first_name = nameInfo.first_name;
//                 last_name = nameInfo.last_name;
//                 owner_name = nameInfo.owner_name;
//                 owner_name_regexp = nameInfo.owner_name_regexp;
//                 if (owner_name === '') continue;
//                 console.log(`Looking for owner: ${owner_name}`);
//             }
//             else {
//                 address_input = document["Property Address"];
//                 address_input_lower = address_input.toLowerCase().replace(/\s/g,'');
//                 let arr_address = address_input.split(' ');
//                 address_no = '';
//                 if (/^\d+$/.test(arr_address[0])){
//                     address_no = arr_address.shift();
//                 }
//                 let address_arr_length = arr_address.length;
//                 address_street = '';
//                 for(let i = 0; i < address_arr_length; i++){
//                     address_street += arr_address.shift()+" ";
//                 }
//                 console.log(`Looking for address: ${address_street}`);
//             }

//             let retry_count = 0;
//             while (true){
//                 if (retry_count > 15){
//                     console.error('Connection/website error for 15 iteration.');
//                     this.browser?.close();
//                     return false;
//                 }
//                 try{
//                     await page.goto('http://www.deltacomputersystems.com/AL/AL43/pappraisala.html'); // Go to search page
//                 } catch(error) {
//                     await page.reload();
//                 }
//                 try{
//                     await page.waitForSelector('input[name="HTMADDRNUMBER"]', {visible: true}) // Wait for input appear
//                     if (this.searchBy === 'name') {
//                         await page.$eval('input[name="HTMNAME"]', (el: any, value: any) => el.value = value, owner_name);
//                     } else {
//                         await page.$eval('input[name="HTMADDRNUMBER"]', (el: any, value: any) => el.value = value, address_no); // Send keys
//                         await page.$eval('input[name="HTMADDRSTREET"]', (el: any, value: any) => el.value = value, address_street);
//                     }
//                     await page.click('input[name="HTMSUBMIT"]');
//                     await page.waitForXPath('/html/body/p/img', {visible: true}) // Waiting for footer image element, this to ensure to all result appear

//                     const rows = await page.$x('//table//table//tr[./td[contains(., "ADDRESS")]]/parent::tbody/tr[position()>1]');
//                     if (rows.length === 0) {
//                         console.log('Not found');
//                         break;
//                     }
//                     const datalinks = [];
//                     if (this.searchBy === 'name') {
//                         console.log(rows.length)
//                         for (const row of rows) {
//                             const {name, link} = await page.evaluate(el => ({name: el.children[0].textContent, link: el.children[0].children[0].href}), row);
//                             const regexp = new RegExp(owner_name_regexp);
//                             if (!regexp.exec(name.toUpperCase())) continue;
//                             datalinks.push(link);
//                         }
//                     }
//                     else {
//                         let {address_result, link} = await page.evaluate(el => ({address_result: el.children[0].textContent, link: el.children[0].children[0].href}), rows[0]);
//                         let address_result_lower = address_result.toLowerCase().replace(/\s/g,'');
//                         if (address_input_lower != address_result_lower) {
//                             console.log(address_input_lower, address_result_lower, "=> The result address doesn't match with the input address!"); // If the address of the input is not match with the address from the search result, skip the address.
//                             break;
//                         }
//                         datalinks.push(link);
//                     }
//                     for (const datalink of datalinks) {
//                         await page.goto(datalink, {waitUntil: 'load'});
//                         await page.waitForXPath('/html/body/p/img', {visible: true}) // Waiting for footer image element, this to ensure to all result appear
//                         let owner_name_xpath = await page.$x('//tr[./td[contains(., "NAME")]]/td[2]');
//                         let owner_names = await page.evaluate(el => el.textContent, owner_name_xpath[0]);
//                         let owner_fullname_1, owner_first_1, owner_last_1, owner_middle_1, owner_suffix_1, owner_fullname_2, owner_first_2, owner_last_2, owner_middle_2, owner_suffix_2;
//                         let arr_names = owner_names.split(" & ");
//                         owner_suffix_1 = this.getSuffix(arr_names[0]);
//                         let name_and_type_1 = this.discriminateAndRemove(arr_names[0]);
//                         owner_fullname_1 = name_and_type_1.name;
//                         let have_2_owners = true;
//                         let name_and_type_2;
//                         try {
//                             owner_suffix_2 = this.getSuffix(arr_names[1]);
//                             name_and_type_2 = this.discriminateAndRemove(arr_names[1]);
//                         } catch {
//                             have_2_owners = false;
//                         }
                        
//                         if (name_and_type_1.type == 'person'){
//                             let owner_1_array = name_and_type_1.name.trim().split(/\s+/g);
//                             owner_last_1 = owner_1_array ? owner_1_array.shift() : '';
//                             owner_first_1 = owner_1_array ? owner_1_array.shift() : '';
//                             owner_middle_1 = owner_1_array ? owner_1_array.shift() : '';
//                         }
//                         if(have_2_owners){
//                             owner_fullname_2 = name_and_type_2.name;
//                             if (name_and_type_2.type == 'person'){
//                                 let owner_2_array = name_and_type_2.name.trim().split(/\s+/g);
//                                 owner_first_2 = owner_2_array ? owner_2_array.shift() : '';
//                                 owner_last_2 = owner_2_array ? owner_2_array.shift() : '';
//                                 owner_middle_2 = owner_2_array ? owner_2_array.shift() : '';
//                             }
//                         }
//                         let parcel_xpath = await page.$x('//tr[./td[contains(., "ADDRESS")]]/parent::tbody//tr[6]/td[1]');
//                         let parcel_tr = await page.evaluate(el => el.textContent, parcel_xpath[0]);
//                         let mailing_address, mailing_detail;
//                         if(parcel_tr.trim().includes('DEED')){ // Check if the address has 2 row for the details
//                             // Mailing Address
//                             let mailing_address_1_xpath = await page.$x('//tr[./td[contains(., "ADDRESS")]]/td[2]');
//                             mailing_address = await page.evaluate(el => el.textContent, mailing_address_1_xpath[0]);
//                             let mailing_detail_xpath = await page.$x('//tr[./td[contains(., "ADDRESS")]]/parent::tbody//tr[5]/td[2]');
//                             mailing_detail = await page.evaluate(el => el.textContent, mailing_detail_xpath[0]);
//                         } else {
//                             // Mailing Address
//                             mailing_address = '';
//                             let mailing_address_1_xpath = await page.$x('//tr[./td[contains(., "ADDRESS")]]/td[2]');
//                             let mailing_address_1 = await page.evaluate(el => el.textContent, mailing_address_1_xpath[0]);
//                             mailing_address += mailing_address_1.trim() + " ";
//                             let mailing_address_2_xpath = await page.$x('//tr[./td[contains(., "ADDRESS")]]/parent::tbody//tr[5]/td[2]');
//                             let mailing_address_2 = await page.evaluate(el => el.textContent, mailing_address_2_xpath[0]);
//                             mailing_address += mailing_address_2.trim();
//                             let mailing_detail_xpath = await page.$x('//tr[./td[contains(., "ADDRESS")]]/parent::tbody//tr[6]/td[2]');
//                             mailing_detail = await page.evaluate(el => el.textContent, mailing_detail_xpath[0]);
//                         }
//                         mailing_address = mailing_address.trim();
//                         let arr_mailing_detail = mailing_detail.trim().split(/\s+/g);
//                         let mailing_zip = arr_mailing_detail.pop();
//                         let mailing_state = arr_mailing_detail.pop();
//                         let mailing_city = '';
//                         for(let city_str of arr_mailing_detail){
//                             mailing_city += city_str + " ";
//                         }
//                         mailing_city = mailing_city.trim();

//                         // Property Address
//                         const [property_address_xpath] = await page.$x('//tr[./td[contains(., "PROPERTY ADDRESS")]]/td[2]');
//                         const property_address = (await page.evaluate(el => el.textContent, property_address_xpath)).trim();

//                         // Property Type
//                         let property_type_xpath = await page.$x('//tr[./td[contains(., "BLDG")]]/td[6]');
//                         let property_type;
//                         try{
//                             property_type = await page.evaluate(el => el.textContent, property_type_xpath[0]);
//                         } catch {
//                             property_type = '';
//                         }
//                         property_type = property_type.trim();

//                         // Last Sale Recording Date
//                         let last_deed_xpath = await page.$x('//tr[./td[contains(., "LAST DEED DATE")]]/td[2]');
//                         let last_deed_date = await page.evaluate(el => el.textContent, last_deed_xpath[0]);
//                         last_deed_date = last_deed_date.trim();

//                         // Est Value
//                         let est_value_xpath = await page.$x('//tr[./td[contains(., "TOTAL PARCEL VALUE")]]/td[2]');
//                         let est_value = await page.evaluate(el => el.textContent, est_value_xpath[0]);
//                         est_value = est_value.trim();

//                         // Owner Occupied
//                         let owner_occupied = false;
//                         if(mailing_state == 'AL'){
//                             let arr_property_address = this.searchBy === 'name' ?  property_address.trim().toLowerCase().split(" ") : address_input.trim().toLowerCase().split(" ");
//                             let arr_mailing_address = mailing_address.trim().toLowerCase().split(" ");
//                             let count_matches = 0;
//                             for(let val1 of arr_property_address){
//                                 for(let val2 of arr_mailing_address){
//                                     if (val1 == val2){
//                                         count_matches += 1;
//                                     }
//                                 }
//                             }
//                             if(arr_property_address[0] == arr_mailing_address[0] && count_matches >= 2){
//                                 owner_occupied = true;
//                             }
//                         }

//                         document['Owner Occupied'] = owner_occupied;
//                         document['Full Name'] = owner_fullname_1 ? owner_fullname_1.trim() : '';
//                         document['First Name'] = owner_first_1 ? owner_first_1 : '';
//                         document['Last Name'] = owner_last_1 ? owner_last_1 : '';
//                         document['Middle Name'] = owner_middle_1 ? owner_middle_1.replace(";","") : '';
//                         document['Name Suffix'] = owner_suffix_1 ? owner_suffix_1 : '';
//                         document['Mailing Care of Name'] = '';
//                         document['Mailing Address'] = mailing_address;
//                         document['Mailing Unit #'] = '';
//                         document['Mailing City'] = mailing_city;
//                         document['Mailing State'] = mailing_state;
//                         document['Mailing Zip'] = mailing_zip;
//                         document['Property Type'] = property_type;
//                         document['Total Assessed Value'] = '';
//                         document['Last Sale Recording Date'] = last_deed_date;
//                         document['Last Sale Amount'] = '';
//                         document['Est. Remaining balance of Open Loans'] = '';
//                         document['Est Value'] = est_value;
//                         document['Effective Year Built'] = '';
//                         document['Est Equity'] = '';
//                         document['Lien Amount'] = '';
//                         document.propertyAppraiserProcessed = true;
//                         if (this.searchBy === 'name')
//                             document['Property Address'] = property_address;
//                         console.log(document);
//                         await document.save();

//                         if(have_2_owners){
//                             let newDocument = await this.cloneMongoDocument(document)
//                             newDocument['Full Name'] = owner_fullname_2 ? owner_fullname_2.trim() : '';
//                             newDocument['First Name'] = owner_first_2 ? owner_first_2 : '';
//                             newDocument['Last Name'] = owner_last_2 ? owner_last_2 : '';
//                             newDocument['Middle Name'] = owner_middle_2 ? owner_middle_2.replace(";","") : '';
//                             newDocument['Name Suffix'] = owner_suffix_2 ? owner_suffix_2 : '';
//                             console.log(newDocument);
//                             await newDocument.save()
//                         }
//                     }
//                     break;
//                 } catch (error){
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
// }