// import puppeteer from 'puppeteer';
// import axios from 'axios';

// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'


// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://beacon.schneidercorp.com/Application.aspx?AppID=86&LayerID=841&PageTypeID=2&PageID=568'
//     }

//     xpaths = {
//         isPAloaded: '//div[contains(@class, "footer-disclaimer-text")]'
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

//     async initiateCaptchaRequest(siteKey: any, pageUrl:any) {
//         const formData = {
//         method: 'userrecaptcha',
//         googlekey: siteKey,
//         key: '7739e42f32c767e3efc0303331a246fb',
//         pageurl: pageUrl,
//         json: 1
//         };
        
//         try {
//         const resp = await axios.post('https://2captcha.com/in.php', formData);
//         if (resp.status == 200) {
//         const respObj = resp.data;
//         console.log(respObj)
//         if (respObj.status == 0) {
//         return Promise.reject(respObj.request);
//         } else {
//         return Promise.resolve(respObj.request);
//         }
//         } else {
//         console.warn(`2Captcha request failed, Status Code: ${resp.status}, INFO: ${resp.data}`);
//         return Promise.reject('Error');
//         }
//         } catch (err) {
//         return Promise.reject(err);
//         }
//     }

//     async resolveRecaptcha(siteKey: any, pageUrl: any, maxTryNo = 7){
//         try {
//         const reqId = await this.initiateCaptchaRequest(siteKey, pageUrl);
//         console.log('captcha requested. awaiting results.')
//         await this.sleep(20000);
//         for (let tryNo = 1; tryNo <= maxTryNo; tryNo++) {
//         try {
//         const result = await this.requestCaptchaResults(reqId);
//         console.log(result);
//         return Promise.resolve(result);
//         } catch (err) {
//         console.warn(err);
//         await this.sleep(20000);
//         }
//         }
//         Promise.reject('Captcha not found within time limit');
//         } catch (err) {
//         console.warn(err);
//         Promise.reject(err);
//         }
//     }

//     async requestCaptchaResults(requestId: any) {
//         const url = `http://2captcha.com/res.php?key=7739e42f32c767e3efc0303331a246fb&action=get&id=${requestId}&json=1`;
        
//         return new Promise(async (resolve, reject) => {
//         const rawResponse = await axios.get(url);
//         const resp = rawResponse.data;
//         if (resp.status === 0) {
//         console.log(resp);
//         return reject(resp.request);
//         }
//         console.log(resp)
//         return resolve(resp.request);
//         })
        
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
//         const url_search = 'https://beacon.schneidercorp.com/Application.aspx?AppID=86&LayerID=841&PageTypeID=2&PageID=568';

//         await page.goto(url_search);

//         try{
//             await page.waitForXPath('//a[contains(., "Agree")]', {visible: true});
//         } catch {
//             await page.waitForXPath('//a[contains(., "Unblock me")]', {visible: true}); // Recaptcha page
//             console.log("Resolving captcha...");
//             let recaptchaSitekeyHandle = await page.$x('//*[@class="g-recaptcha"]');
//             let siteKey = await recaptchaSitekeyHandle[0].evaluate((elem) => elem.getAttribute('data-sitekey'));
//             let pageUrl = await page.url();
//             const captchaSolution:any = await this.resolveRecaptcha(siteKey, pageUrl);
//             let recaptchaHandle = await page.$x('//*[@id="g-recaptcha-response"]');
//             await recaptchaHandle[0].evaluate((elem:any, captchaSolution:any) => elem.innerHTML = captchaSolution, captchaSolution);
//             console.log("Done.");
//             await page.waitFor(3000);
//             let submit_recaptcha = await page.$x('//a[contains(., "Unblock me")]');
//             await submit_recaptcha[0].click();
//         }
        
//         try{
//             await page.waitForXPath('//a[contains(., "Agree")]', {visible: true});
//             let agree_button = await page.$x('//a[contains(., "Agree")]'); // Wait for pop up
//             agree_button[0].click();
//         } catch{
//             // pass it
//         }
//         await page.waitFor(2000);
//         await page.waitForXPath('//a[contains(., "Close")]', {visible: true});
//         let close_button = await page.$x('//a[contains(., "Close")]'); // Wait for pop up
//         close_button[0].click();
//         await page.waitForSelector('.footer-disclaimer-text', {visible: true});

//         for (let document of docsToParse) {
//             this.searchBy = document["Property Address"] ? 'address' : 'name';
//             // do everything that needs to be done for each document here
//             let address_input = '';
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';

//             if (this.searchBy === 'name') {
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
//                 console.log(`Looking for address: ${address_input}`);
//             }

//             await page.goto(url_search);
//             try {
//                 await page.waitForSelector('.footer-disclaimer-text', {visible: true});
//             } catch {
//                 let is_captcha = true;
//                 try{
//                     await page.waitForXPath('//a[contains(., "Unblock me")]', {visible: true}); // Recaptcha page
//                 } catch {
//                     is_captcha = false;
//                 }
//                 if (is_captcha){
//                     console.log("Resolving captcha...");
//                     let recaptchaSitekeyHandle = await page.$x('//*[@class="g-recaptcha"]');
//                     let siteKey = await recaptchaSitekeyHandle[0].evaluate((elem) => elem.getAttribute('data-sitekey'));
//                     let pageUrl = await page.url();
//                     const captchaSolution:any = await this.resolveRecaptcha(siteKey, pageUrl);
//                     let recaptchaHandle = await page.$x('//*[@id="g-recaptcha-response"]');
//                     await recaptchaHandle[0].evaluate((elem, captchaSolution) => elem.innerHTML = captchaSolution, captchaSolution);
//                     console.log("Done.");
//                     await page.waitFor(3000);
//                     let submit_recaptcha = await page.$x('//a[contains(., "Unblock me")]');
//                     await submit_recaptcha[0].click();
//                     await page.waitForSelector('.footer-disclaimer-text', {visible: true});
//                 }
//             }
//             if (this.searchBy === 'name') {
//                 await page.$eval('input[name="ctlBodyPane$ctl00$ctl01$txtName"]', (el:any, value:any) => el.value = value, owner_name); // Send keys
//                 await page.click('a[id="ctlBodyPane_ctl00_ctl01_btnSearch"]');
//             } else {
//                 await page.$eval('input[name="ctlBodyPane$ctl01$ctl01$txtAddress"]', (el:any, value:any) => el.value = value, address_input); // Send keys
//                 await page.click('a[id="ctlBodyPane_ctl01_ctl01_btnSearch"]');
//             }
//             await page.waitForNavigation();
//             try {
//                 await page.waitForSelector('.footer-disclaimer-text', {visible: true});
//             } catch {
//                 let is_captcha = true;
//                 try{
//                     await page.waitForXPath('//a[contains(., "Unblock me")]', {visible: true}); // Recaptcha page
//                 } catch {
//                     is_captcha = false;
//                 }
//                 if (is_captcha){
//                     console.log("Resolving captcha...");
//                     let recaptchaSitekeyHandle = await page.$x('//*[@class="g-recaptcha"]');
//                     let siteKey = await recaptchaSitekeyHandle[0].evaluate((elem) => elem.getAttribute('data-sitekey'));
//                     let pageUrl = await page.url();
//                     const captchaSolution:any = await this.resolveRecaptcha(siteKey, pageUrl);
//                     let recaptchaHandle = await page.$x('//*[@id="g-recaptcha-response"]');
//                     await recaptchaHandle[0].evaluate((elem, captchaSolution) => elem.innerHTML = captchaSolution, captchaSolution);
//                     console.log("Done.");
//                     await page.waitFor(3000);
//                     let submit_recaptcha = await page.$x('//a[contains(., "Unblock me")]');
//                     await submit_recaptcha[0].click();
//                     await page.waitForSelector('.footer-disclaimer-text', {visible: true});
//                 }
//             }


//             // check to have several results
//             const manyResults = await page.$x('//table[contains(@id, "_gvwParcelResults")]/tbody/tr');
//             if (manyResults && manyResults.length > 0) {
//                 const rows = await page.$x('//table[contains(@id, "_gvwParcelResults")]/tbody/tr');
//                 if (rows.length === 0) {
//                     console.log("No results found");
//                     continue;
//                 }
//                 const datalinks = [];
//                 if (this.searchBy === 'name') {
//                     for (const row of rows) {
//                         let {name, link} = await page.evaluate(el => ({name: el.children[2].textContent, link: el.children[1].children[0].href}), row);
//                         name = name.replace(/\n|\s+/gm, ' ').trim();
//                         const regexp = new RegExp(owner_name_regexp);
//                         if (!regexp.exec(name.toUpperCase())) continue;
//                         datalinks.push(link);
//                     }
//                 }
//                 else {
//                     const link = await page.evaluate(el => el.children[1].children[0].href, rows[0]);
//                     datalinks.push(link);
//                 }
//                 for (const datalink of datalinks) {
//                     await page.goto(datalink, {waitUntil: 'load'});
//                     await this.getData(page, document);
//                 }
//             }
//             else {
//                 await this.getData(page, document);
//             }
//         }
//         return true;
//     }
//     async getData(page: puppeteer.Page, document: IPublicRecordAttributes) {
//         // Property Address
//         let property_address;
//         try{
//             property_address = await page.evaluate(el => el.textContent, (await page.$x('//*[contains(.,"Property Address")]/ancestor::tr/td[1]/span/text()[1]'))[0]);
//         } catch {
//             console.log("Property Address was not found!");
//             return;
//         }        let property_city_zip_combined = await page.evaluate(el => el.textContent, (await page.$x('//th[contains(.,"Property Address")]/parent::tr/td[1]/span/text()[2]'))[0]);
//         let property_city_zip_combined_arr = property_city_zip_combined.split(" ");
//         const property_zip = property_city_zip_combined_arr.pop();
//         const property_state = property_city_zip_combined_arr.pop();
//         let property_city = '';
//         for(let city of property_city_zip_combined_arr){
//             property_city += city + ' ';
//         }
//         property_city = property_city.trim();

//         // Owner Names
//         let owner_names_1 = await page.evaluate(el => el.textContent, (await page.$x('//td[contains(., "Deed Holder")]/ancestor::tbody/tr[2]/td/child::*[1]'))[0]);
//         let owner_names_2;
//         try {
//             owner_names_2 = await page.evaluate(el => el.textContent, (await page.$x('//td[contains(., "Deed Holder")]/ancestor::tbody/tr[4]/td/child::*[1]'))[0]);
//         } catch {
//         }

//         // Mailing Address
//         const mailing_address = await page.evaluate(el => el.textContent, (await page.$x('//td[contains(., "Mailing Address")]/ancestor::tbody/tr[2]/td/child::*[1]/text()[2]'))[0]);
//         let mailing_city_zip_combined = await page.evaluate(el => el.textContent, (await page.$x('//td[contains(., "Mailing Address")]/ancestor::tbody/tr[2]/td/child::*[1]/text()[3]'))[0]);
//         let mailing_city_zip_combined_arr = mailing_city_zip_combined.split(" ");
//         const mailing_zip = mailing_city_zip_combined_arr.pop();
//         const mailing_state = mailing_city_zip_combined_arr.pop();
//         let mailing_city = '';
//         for(let city of mailing_city_zip_combined_arr){
//             mailing_city += city + ' ';
//         }
//         mailing_city = mailing_city.trim();

//         // Property Type
//         const property_type = await page.evaluate(el => el.textContent, (await page.$x('//th[contains(., "Property Class")]/parent::tr/td[1]/span'))[0]);

//         // Total Assessed Value
//         const total_assessed_value = await page.evaluate(el => el.textContent, (await page.$x('//th[contains(., "Net Assessed Value")]/parent::tr/td[2]'))[0]);

//         // Last Sale Date
//         let last_sale_date, last_sale_amount;
//         try{
//             last_sale_date = await page.evaluate(el => el.textContent, (await page.$x('//div[contains(., "Sales")]/ancestor::section/div/div/table/tbody/tr[1]/th'))[0]);
//             last_sale_amount = await page.evaluate(el => el.textContent, (await page.$x('//div[contains(., "Sales")]/ancestor::section/div/div/table/tbody/tr[1]/child::*[8]'))[0]);
//         } catch {
//             last_sale_date = '';
//             last_sale_amount = '';
//         }

//         /* Normalize the name */
//         let owner_fullname_1, owner_first_1, owner_last_1, owner_middle_1, owner_suffix_1, owner_fullname_2, owner_first_2, owner_last_2, owner_middle_2, owner_suffix_2;

//         // let arr_names = owner_names.split(" & ");
//         owner_suffix_1 = this.getSuffix(owner_names_1);
//         let name_and_type_1 = this.discriminateAndRemove(owner_names_1);
//         // owner_suffix_1 = this.getSuffix(name_and_type_1.name);
//         owner_fullname_1 = name_and_type_1.name;
//         let have_2_owners = true;
//         let name_and_type_2;
//         try {
//             owner_suffix_2 = this.getSuffix(owner_names_2);
//             name_and_type_2 = this.discriminateAndRemove(owner_names_2);
//         } catch {
//             have_2_owners = false;
//         }
        
//         if (name_and_type_1.type == 'person'){
//             let owner_1_array = name_and_type_1.name.trim().split(/,\s+/g);
//             owner_last_1 = owner_1_array ? owner_1_array.shift() : '';
//             if(owner_1_array.length > 0){
//                 let owner_1_array_2 = owner_1_array[0].trim().split(/\s+/g);
//                 owner_first_1 = owner_1_array_2 ? owner_1_array_2.shift() : '';
//                 owner_middle_1 = owner_1_array_2 ? owner_1_array_2.shift() : '';
//             } else {
//                 owner_first_1 = '';
//                 owner_middle_1 = '';
//             }
//         } else {
//             owner_suffix_1 = '';
//         }
//         if(have_2_owners){
//             owner_fullname_2 = name_and_type_2.name;
//             if (name_and_type_2.type == 'person'){
//                 let owner_2_array = name_and_type_2.name.split(", ");
//                 owner_last_2 = owner_2_array ? owner_2_array.shift() : '';
//                 if(owner_2_array.length > 0){
//                     let owner_2_array_2 = owner_2_array[0].trim().split(/\s+/g);
//                     owner_first_2 = owner_2_array_2 ? owner_2_array_2.shift() : '';
//                     owner_middle_2 = owner_2_array_2 ? owner_2_array_2.shift() : '';
//                 } else {
//                     owner_first_2 = '';
//                     owner_middle_2 = '';
//                 }
//             } else {
//                 owner_suffix_2 = '';
//             }
//         }

//         // Owner Occupied
//         let owner_occupied = false;
//         if(mailing_state == 'IA'){
//             let arr_property_address = property_address.toLowerCase().split(" ");
//             let arr_mailing_address = mailing_address.toLowerCase().split(" ");
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
    
//         document['Owner Occupied'] = owner_occupied;
//         document['Full Name'] = owner_fullname_1 ? owner_fullname_1 : '';
//         document['First Name'] = owner_first_1 ? owner_first_1 : '';
//         document['Last Name'] = owner_last_1 ? owner_last_1 : '';
//         document['Middle Name'] = owner_middle_1 ? owner_middle_1 : '';
//         document['Name Suffix'] = owner_suffix_1 ? owner_suffix_1 : '';
//         document['Mailing Care of Name'] = '';
//         document['Mailing Address'] = mailing_address;
//         document['Mailing Unit #'] = '';
//         document['Mailing City'] = mailing_city;
//         document['Mailing State'] = mailing_state;
//         document['Mailing Zip'] = mailing_zip;
//         document['Property Type'] = property_type;
//         document['Total Assessed Value'] = total_assessed_value;
//         document['Last Sale Recording Date'] = last_sale_date;
//         document['Last Sale Amount'] = last_sale_amount;
//         document['Est. Remaining balance of Open Loans'] = '';
//         document['Est Value'] = '';
//         document['Effective Year Built'] = '';
//         document['Est Equity'] = '';
//         document['Lien Amount'] = '';
//         if (this.searchBy === 'name') {
//             document['Property Address'] = property_address;
//             document['Property City'] = property_city;
//         }
//         await document.save();
//         console.log(document);
//         if(have_2_owners){
//             let newDocument = await this.cloneMongoDocument(document);
//             newDocument['Full Name'] = owner_fullname_2 ? owner_fullname_2 : '';
//             newDocument['First Name'] = owner_first_2 ? owner_first_2 : '';
//             newDocument['Last Name'] = owner_last_2 ? owner_last_2 : '';
//             newDocument['Middle Name'] = owner_middle_2 ? owner_middle_2 : '';
//             newDocument['Name Suffix'] = owner_suffix_2 ? owner_suffix_2 : '';
//             await newDocument.save();
//         }
//     }
// }