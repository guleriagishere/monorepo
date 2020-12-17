// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// const axios = require("axios");

// const input_address_selector = '#Address';
// const input_name_selector = '#OwnLast';
// const search_button_xpath = '//*[@id="searchform"]/div[3]/div/div/div/div/div[1]/input';
// const owner_name_xpath = '//div[contains(., "Ownership:")]/ancestor::div[@id="ownerData"]/div/div/div[2]/div[2]';
// const mailing_address_xpath = '//div[contains(., "Mailing Address:")]/ancestor::div[@id="ownerData"]/div/div/div[4]/div[2]';
// const property_address_xpath = '//div[contains(., "Situs Address:")]/ancestor::div[@id="ownerData"]/div/div/div[6]/div[2]';
// const property_type_xpath = '//div[./div[contains(.,"Land Use")]]/div[contains(@class, "col-sm m-0 p-0")]';
// const last_sale_date_xpath = '//th[contains(.,"Sale Date")]/ancestor::div[./table[@id="tableSales"]]//tr[@class="odd"][1]/td[1]';
// const assessed_value_xpath = '//th[contains(.,"School Assessed Value")]//ancestor::div[./table[@id="tableValue"]]//tr[@class="odd"][1]/td[7]';
// const last_sale_amount_xpath = '//th[contains(.,"Sale Date")]/ancestor::div[./table[@id="tableSales"]]//tr[@class="odd"][1]/td[6]';
// const est_value_xpath = '//th[contains(.,"School Assessed Value")]//ancestor::div[./table[@id="tableValue"]]//tr[@class="odd"][1]/td[5]';
// const building_button_selector = '#buildings-nav';
// const year_built_xpath = '//th[contains(.,"Effyr")]//ancestor::div[./table[@id="tableBuildings"]]//tr[@class="odd"][1]/td[5]';

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://www.manateepao.com/search/'
//     }

//     xpaths = {
//         isPAloaded: '//input[@id="Address"]'
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

//         let page = this.browserPages.propertyAppraiserPage!;
//         const url_search = 'https://www.manateepao.com/search/';
//         let uaString = (await this.browser!.userAgent()).replace("Headless", "")
//         await page.setUserAgent(uaString);

//         for (let document of docsToParse) {
//             // let docToSave: any = await this.getLineItemObject(document);
//             if (!this.decideSearchByV2(document)) {
//                    console.log('Insufficient info for Owner and Property');
//                     continue;
//             }            
//             // do everything that needs to be done for each document here
//             let address_input = '';
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';

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
//                 address_input = document.propertyId["Property Address"]
//                 console.log(`Looking for address: ${address_input}`);
//             }

//             let retry_count = 0;
//             while (true){
//                 if (retry_count > 15){
//                     console.error('Connection/website error for 15 iteration.');
//                     await this.browser?.close();
//                     return false;
//                 }
//                 try {
//                     await page.goto(url_search);
//                     await page.waitForSelector(input_address_selector, {visible: true});
//                     break;
//                 } catch (error){
//                     console.error(error);
//                     await this.browser?.close();
//                     let power = Math.pow(2, retry_count + 1);
//                     let duration = (power - 1) * 1001;
//                     this.sleep(duration);
//                     retry_count += 1;
//                     this.browser = await this.launchBrowser();
//                     page = await this.browser.newPage();
//                     await this.setParamsForPage(page);
//                     let uaString = (await this.browser!.userAgent()).replace("Headless", "")
//                     await page.setUserAgent(uaString);
//                 }
//             }
//             try {
//                 await page.waitForXPath(search_button_xpath, {visible: true});
//                 if (this.searchBy === 'name')
//                     await page.$eval(input_name_selector, (el:any, value:any) => el.value = value, owner_name); // Send keys
//                 else
//                     await page.$eval(input_address_selector, (el:any, value:any) => el.value = value, address_input); // Send keys
//                 let button_search = await page.$x(search_button_xpath);
//                 await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
//                 await button_search[0].focus();
//                 await button_search[0].click();
                
//                 await page.waitFor(() => 
//                     document.querySelectorAll('#gridsearch, #ownerContentScollContainer').length
//                 );
//                 await page.waitFor(3000);
//                 await page.waitFor(() => 
//                     document.querySelectorAll('#gridsearch, #ownerContentScollContainer').length
//                 );
                
//                 if(await page.$('#gridsearch') != null)
//                 {
//                     const [nodata] = await page.$x('//span[contains(text(), "No Data")]');
//                     if (nodata) {
//                         console.log("No house found");
//                         continue;
//                     }
//                     // click show all
//                     const [showButton] = await page.$x('//span[starts-with(text(), "Show ")]');
//                     if (showButton) await showButton.click();
//                     await page.waitFor(1000);
//                     const [allItem] = await page.$x('//span[text()="ALL"]');
//                     if (allItem) await allItem.click();
//                     await page.waitFor(1000);

//                     // check for parcels
//                     const rows = await page.$x('//table[@id="gridsearch"]/tbody/tr');
//                     const datalinks = [];
//                     if (this.searchBy === 'name') {
//                         for (const row of rows) {
//                             const {link, name} = await page.evaluate(el => ({link: el.children[0].children[0].href, name: el.children[2].children[0].textContent}), row);
//                             const regexp = new RegExp(owner_name_regexp);
//                             if (!regexp.exec(name.toUpperCase())) continue;
//                             console.log(name)
//                             datalinks.push(link);
//                         }
//                     }
//                     else {
//                         const link = await page.evaluate(el => el.children[0].children[0].href, rows[0]);
//                         datalinks.push(link);
//                     }
                    
//                     // check for links
//                     for (const datalink of datalinks) {
//                         await page.goto(datalink, {waitUntil: 'load'});
//                         await this.getData(page, document, address_input);
//                     }
//                 }
//                 else if (await page.$('#ownerContentScollContainer')) {
//                     await this.getData(page, document, address_input);
//                 }
//                 else {
//                     console.log('No house found');
//                 }
//             } catch (error) {
//                 console.log(error);
//             }
//         }
//         return true;
//     }
//     async getData(page: puppeteer.Page, document: any, address_input: string) {
//         let dataFromPropertyAppraisers: any = {};
//         await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
//         await page.waitForXPath('//th[contains(., "Tax Year")]');
//         let owner_names = await page.evaluate(el => el.textContent, (await page.$x(owner_name_xpath))[0]);
//         let mailing_address_combined = await page.evaluate(el => el.textContent, (await page.$x(mailing_address_xpath))[0]);
//         let property_address_combined = await page.evaluate(el => el.textContent, (await page.$x(property_address_xpath))[0]);
//         let property_type;
//         try{
//             property_type = await page.evaluate(el => el.textContent, (await page.$x(property_type_xpath))[0]);
//         } catch {
//             property_type = '';
//         }
//         let last_sale_date;
//         try{
//             last_sale_date = await page.evaluate(el => el.textContent, (await page.$x(last_sale_date_xpath))[0]);
//         } catch {
//             last_sale_date = '';
//         }
//         let total_assessed_value;
//         try{
//             total_assessed_value = await page.evaluate(el => el.textContent, (await page.$x(assessed_value_xpath))[0]);
//         } catch {
//             total_assessed_value = '';
//         }
//         let last_sale_amount;
//         try{
//             last_sale_amount = await page.evaluate(el => el.textContent, (await page.$x(last_sale_amount_xpath))[0]);
//         } catch {
//             last_sale_amount = '';
//         }
//         let est_value;
//         try{
//             est_value = await page.evaluate(el => el.textContent, (await page.$x(est_value_xpath))[0]);
//         } catch {
//             est_value = '';
//         }
//         await page.focus(building_button_selector);
//         await page.keyboard.type('\n');
        
//         let effective_year_built;
//         try{
//             await page.waitForXPath('//th[contains(., "Effyr")]');
//             effective_year_built = await page.evaluate(el => el.textContent, (await page.$x(year_built_xpath))[0]);
//         } catch {
//             effective_year_built = '';
//         }

//         /* Normalize the name */
//         let owner_fullname_1, owner_first_1, owner_last_1, owner_middle_1, owner_suffix_1, owner_fullname_2, owner_first_2, owner_last_2, owner_middle_2, owner_suffix_2;
//         let arr_names = owner_names.split("; ");
//         owner_suffix_1 = this.getSuffix(arr_names[0]);
//         let name_and_type_1 = this.discriminateAndRemove(arr_names[0]);
//         owner_fullname_1 = name_and_type_1.name;
//         let have_2_owners = true;
//         let name_and_type_2;
//         try {
//             owner_suffix_2 = this.getSuffix(arr_names[1]);
//             name_and_type_2 = this.discriminateAndRemove(arr_names[1]);
//         } catch {
//             have_2_owners = false;
//         }
        
//         if (name_and_type_1.type == 'person'){
//             let owner_1_array = name_and_type_1.name.split(" ");
//             owner_last_1 = owner_1_array ? owner_1_array.shift() : '';
//             owner_first_1 = owner_1_array ? owner_1_array.shift() : '';
//             owner_middle_1 = owner_1_array ? owner_1_array.shift() : '';
//         } else {
//             owner_suffix_1 = '';
//         }
//         if(have_2_owners){
//             owner_fullname_2 = name_and_type_2.name;
//             if (name_and_type_2.type == 'person'){
//                 let owner_2_array = name_and_type_2.name.split(" ");
//                 owner_last_2 = owner_2_array ? owner_2_array.shift() : '';
//                 owner_first_2 = owner_2_array ? owner_2_array.shift() : '';
//                 owner_middle_2 = owner_2_array ? owner_2_array.shift() : '';
//             } else {
//                 owner_suffix_2 = '';
//             }
//         }
//         owner_last_1 = owner_last_1 ? owner_last_1.replace(",","") : '';
//         owner_last_2 = owner_last_2 ? owner_last_2.replace(",","") : '';

//         /* Normalize the mailing address */
//         let mailing_address_combined_arr = mailing_address_combined.split(", ");
//         let mailing_address = mailing_address_combined_arr[0];
//         let mailing_city_zip_combined = mailing_address_combined_arr[1];
//         let mailing_city_zip_combined_arr = mailing_city_zip_combined.split(" ");
//         let mailing_zip = mailing_city_zip_combined_arr.pop();
//         let mailing_state = mailing_city_zip_combined_arr.pop();
//         let mailing_city = '';
//         for(let city of mailing_city_zip_combined_arr){
//             mailing_city += city + ' ';
//         }
//         mailing_city = mailing_city.trim();

//         /* Normalize the property address */
//         let property_address_combined_arr = property_address_combined.split(", ");
//         let property_address = property_address_combined_arr[0];
//         let property_city_zip_combined = property_address_combined_arr[1];
//         let property_city_zip_combined_arr = property_city_zip_combined.split(" ");
//         let property_zip = property_city_zip_combined_arr.pop();
//         let property_state = property_city_zip_combined_arr.pop();
//         let property_city = '';
//         for(let city of property_city_zip_combined_arr){
//             property_city += city + ' ';
//         }
//         property_city = property_city.trim();

//         // Owner Occupied
//         let owner_occupied = false;
//         try{
//             if(mailing_state.trim() == 'FL'){
//                 let arr_property_address = this.searchBy === 'name' ? property_address.trim().toLowerCase().split(" ") : address_input.trim().toLowerCase().split(" ");
//                 let arr_mailing_address = mailing_address.trim().toLowerCase().split(" ");
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
//         } catch {
//             mailing_state = '';
//             mailing_city = '';
//             mailing_zip = '';
//             mailing_address = '';
//         }

//         dataFromPropertyAppraisers['Owner Occupied'] = owner_occupied;
//         dataFromPropertyAppraisers['Full Name'] = owner_fullname_1 ? owner_fullname_1.trim() : '';
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
//         dataFromPropertyAppraisers['Effective Year Built'] = effective_year_built;
//         dataFromPropertyAppraisers['Est Equity'] = '';
//         dataFromPropertyAppraisers['Lien Amount'] = '';
//         // dataFromPropertyAppraisers.propertyAppraiserProcessed = true;
//         dataFromPropertyAppraisers['Property Address'] = property_address;
//         dataFromPropertyAppraisers['Property City'] = property_city;
//         dataFromPropertyAppraisers['Property State'] = 'FL';
//         dataFromPropertyAppraisers['Property Zip'] = property_zip;
//         dataFromPropertyAppraisers['County'] = 'Manatee';

//         await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
        
// 		// await this.saveToLineItem(doc);
//         // await this.saveToOwnerProductProperty(doc);
//         // console.log(doc);

//         // if(have_2_owners){
//         //     let newDocument = await this.cloneDocument(doc);
//         //     newDocument['Full Name'] = owner_fullname_2 ? owner_fullname_2.trim() : '';
//         //     newDocument['First Name'] = owner_first_2 ? owner_first_2 : '';
//         //     newDocument['Last Name'] = owner_last_2 ? owner_last_2 : '';
//         //     newDocument['Middle Name'] = owner_middle_2 ? owner_middle_2 : '';
//         //     newDocument['Name Suffix'] = owner_suffix_2 ? owner_suffix_2 : '';
//         //     await this.saveToLineItem(newDocument);
//         //     await this.saveToOwnerProductProperty(newDocument);
    
//         //     console.log(newDocument);
//         // }
//     }
// }