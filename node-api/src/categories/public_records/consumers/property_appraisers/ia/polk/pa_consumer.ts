// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import {IPublicRecordAttributes} from '../../../../../../models/public_record_attributes';
// import puppeteer from "puppeteer";
// const nameParsingService = require('../../consumer_dependencies/nameParsingService');
// const addressService = require('../../consumer_dependencies/addressService');

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'http://web.assess.co.polk.ia.us/cgi-bin/web/tt/infoqry.cgi?tt=home/index',
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="straddr__address"]',
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async finderUrl(page: puppeteer.Page, owner_name_regexp: string) {
//         const urlSelector = 'tbody > tr > td:first-child > a';
//         const nameSelector = 'tbody > tr > td:nth-child(5)';
//         let data: any = {};
//         let urlArray = [];
//         try {
//             data = await page.evaluate((urlSelector) => {
//                 let options = Array.from(document.querySelectorAll(urlSelector));
//                 let names = Array.from(document.querySelectorAll(nameSelector));
//                 return {urls: options.map(x => x.href), names};
//             }, urlSelector);

//             if (this.searchBy === 'name') {
//                 for (let i = 0 ; i < data.names ; i++) {
//                     const name = data.names[i];
//                     const regexp = new RegExp(owner_name_regexp);
//                     if (!regexp.exec(name.toUpperCase())) continue;
//                     urlArray.push(data.urls[i]);
//                 }
//             }
//             else {
//                 urlArray = data.urls;
//             }
//         } catch (e) {
//             console.log(e);
//         }
//         return urlArray;
//     }

//     async getTextByXpathFromPage(page: puppeteer.Page, xPath: string) {
//         const [elm] = await page.$x(xPath)
//         if (elm == null) {
//             return '';
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');
//     }

//     async getMailingAddress(page: puppeteer.Page) {
//         const mailingAddressSelector = '//caption[contains(text(), "Legal Description and Mailing Address")]/following-sibling::tbody/tr/td[2]';
//         const splitNameFromAddressRegex = new RegExp(/(?:.\n)(?<address>.*)/s);
//         const [elm] = await page.$x(mailingAddressSelector);
//         if (elm == null) {
//             return '';
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         const match = splitNameFromAddressRegex.exec(text);
//         if (match && match.groups && match.groups.address) {
//             return match.groups.address;
//         }
//         return text;
//     };

//     async getPropertyAddress(page: puppeteer.Page) {
//         const propertyAddressSelector = '//th[text()="Address"]/following-sibling::td';
//         const [elm] = await page.$x(propertyAddressSelector);
//         if (elm == null) {
//             return '';
//         }
//         let text = await page.evaluate(j => j.innerText, elm);        
//         text = text.replace(/\s+/gs, ' ').trim();
//         return text;
//     };

//     async parsePage(page: puppeteer.Page, propertyAddress: string) {
//         await page.waitForXPath('//caption[contains(text(), "Ownership - ")]/following-sibling::tbody/tr/td[3]');
//         const processedNamesArray = await this.getOwners(page);
//         let address:any = await this.getMailingAddress(page);
//         const {state, city, zip} = addressService.parsingDelimitedAddress(address);
//         address = address.replace(/\n/g, ' ').trim().replace(/  +/g, ' ');
//         if (this.searchBy === 'name') {
//             propertyAddress = await this.getPropertyAddress(page);
//         }
//         let isOwnerOccupied = addressService.comparisonAddresses(address, propertyAddress)

//         let propertyType = await this.getTextByXpathFromPage(page, '//caption[contains(text(), "Current Values")]/following-sibling::tbody/tr[1]/td[2]');
//         if (propertyType == 'Total Value'){
//             propertyType = await this.getTextByXpathFromPage(page, '//caption[contains(text(), "Current Values")]/following-sibling::tbody/tr[3]/td[2]');
//         }
//         const estimationValue = await this.getTextByXpathFromPage(page, '//caption[contains(text(), "Current Values")]/following-sibling::tbody/tr[1]/td[6]');
//         const grossAssessedValue = await this.getTextByXpathFromPage(page, '//caption[contains(text(), "Historical Values")]/following-sibling::tbody/tr[1]/td[7]');
//         const yearBuild = await this.getTextByXpathFromPage(page, '//th[contains(text(), "Year Built")]/following-sibling::td[1]');

//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property Address': propertyAddress,
//             'Property City': '',
//             'Property State': 'IOWA',
//             'Property Zip': '',
//             'County': 'Polk',
//             'Owner Occupied': isOwnerOccupied,
//             'Mailing Care of Name': '',
//             'Mailing Address': address,
//             'Mailing Unit #': '',
//             'Mailing City': city,
//             'Mailing State': state,
//             'Mailing Zip': zip,
//             'Property Type': propertyType ? propertyType : '',
//             'Total Assessed Value': grossAssessedValue ? grossAssessedValue : '',
//             'Last Sale Recoding Date': '',
//             'Last Sale Amount': '',
//             'Est. Value': estimationValue,
//             'Effective Year Built': yearBuild,
//             'Est. Equity': '',
//         };
//     }

//     async getOwners(page: puppeteer.Page) {
//         const owners = [];
//         const elm = await page.$x('//caption[contains(text(), "Ownership - ")]/following-sibling::tbody/tr/td[3]');
//         for (let i = 0; i < elm.length; i++) {
//             let text = await page.evaluate(j => j.innerText, elm[i]);
//             owners.push(...nameParsingService.parseOwnersFullName(text.replace(/\n/g, ' ')));
//         }
//         return owners;
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
//             await this.browserPages.propertyAppraiserPage.goto(this.urls.propertyAppraiserPage, {waitUntil: 'load'});
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
//         const page = this.browserPages.propertyAppraiserPage;
//         if (page === undefined) return false;
//         const urlSelector = 'tbody > tr > td:first-child > a';

//         for (let document of docsToParse) {
//             this.searchBy = document["Property Address"] ? 'address' : 'name';
//             let address = '';
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';
//             try {
//                 if (this.searchBy === 'name') {
//                     const nameInfo = this.getNameInfo(document);
//                     first_name = nameInfo.first_name;
//                     last_name = nameInfo.last_name;
//                     owner_name = nameInfo.owner_name;
//                     owner_name_regexp = nameInfo.owner_name_regexp;
//                     if (owner_name === '') continue;
//                     console.log(`Looking for owner: ${owner_name}`);
//                 }
//                 else {
//                     address = document["Property Address"];
//                     console.log(`Looking for address: ${address}`);
//                 }

//                 if (this.searchBy === 'name') {
//                     await page.waitForSelector('#oname__lname');
//                     await page.focus('#oname__lname');
//                     await page.keyboard.type(last_name);
//                     await page.focus('#oname__fname');
//                     await page.keyboard.type(first_name);
//                 }
//                 else {
//                     await page.waitForSelector('#straddr__address');
//                     await page.focus('#straddr__address');
//                     await page.keyboard.type(address);
//                 }
//                 await page.click('input[name="submit_form"]');
//                 await page.waitForSelector('#wrapper');
//                 const locationPath = await page.evaluate(() => window.location.pathname);

//                 if (locationPath === '/cgi-bin/web/tt/form.cgi') {
//                     await page.waitForSelector(urlSelector, {timeout: 5000});
//                     let urls = await this.finderUrl(page, owner_name_regexp);
//                     for (let j = 0; j < urls.length; j++) {
//                         await page.goto(urls[j], {waitUntil: 'domcontentloaded'});
//                         await page.waitForSelector('#wrapper');
//                         const result = await this.parsePage(page, document["Property Address"]);
//                         for (let index = 0; index < result['owner_names'].length; index++) {
//                             const owner_name = result['owner_names'][index];
//                             if (index == 0 && j == 0) {
//                                 document['Full Name'] = owner_name['fullName'] ? owner_name['fullName'] : '';
//                                 document['First Name'] = owner_name['firstName'];
//                                 document['Last Name'] = owner_name['lastName'];
//                                 document['Middle Name'] = owner_name['middleName'];
//                                 document['Name Suffix'] = owner_name['suffix'];
//                                 document['Property Address'] = result['Property Address'];
//                                 document['Property State'] = 'IA';
//                                 document['Owner Occupied'] = result['Owner Occupied'];
//                                 document['Mailing Care of Name'] = '';
//                                 document['Mailing Address'] = result['Mailing Address'];
//                                 document['Mailing City'] = result['Mailing City'];
//                                 document['Mailing State'] = result['Mailing State'];
//                                 document['Mailing Zip'] = result['Mailing Zip'];
//                                 document['Mailing Unit #'] = '';
//                                 document['Property Type'] = result['Property Type'];
//                                 document['Total Assessed Value'] = result['Total Assessed Value'];
//                                 document['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                 document['Last Sale Amount'] = result['Last Sale Amount'];
//                                 document['Est. Remaining balance of Open Loans'] = '';
//                                 document['Est Value'] = result['Est. Value'];
//                                 document['Effective Year Built'] = result['Effective Year Built'];
//                                 document['Est Equity'] = '';
//                                 document.propertyAppraiserProcessed = true;
//                                 console.log(document);
//                                 await document.save();
//                             } else {
//                                 let newDocument = await this.cloneMongoDocument(document)
//                                 newDocument['Full Name'] = owner_name['fullName'] ? owner_name['fullName'] : '';
//                                 newDocument['First Name'] = owner_name['firstName'];
//                                 newDocument['Last Name'] = owner_name['lastName'];
//                                 newDocument['Middle Name'] = owner_name['middleName'];
//                                 newDocument['Name Suffix'] =  owner_name['suffix'];
//                                 newDocument['Owner Occupied'] = result['Owner Occupied'];
//                                 newDocument['Mailing Care of Name'] = '';
//                                 newDocument['Mailing Address'] = result['Mailing Address'];
//                                 newDocument['Mailing City'] = result['Mailing City'];
//                                 newDocument['Mailing State'] = result['Mailing State'];
//                                 newDocument['Mailing Zip'] = result['Mailing Zip'];
//                                 newDocument['Mailing Unit #'] = '';
//                                 newDocument['Property Type'] = result['Property Type'];
//                                 newDocument['Total Assessed Value'] = result['Total Assessed Value'];
//                                 newDocument['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                 newDocument['Last Sale Amount'] = result['Last Sale Amount'];
//                                 newDocument['Est. Remaining balance of Open Loans'] = '';
//                                 newDocument['Est Value'] = result['Est. Value'];
//                                 newDocument['Effective Year Built'] = result['Effective Year Built'];
//                                 newDocument['Est Equity'] = '';
//                                 console.log(newDocument);
//                                 await newDocument.save();
//                             }
//                         }
//                     }
//                 } else {

//                     const result = await this.parsePage(page, document["Property Address"]);
//                     for (let i = 0; i < result['owner_names'].length; i++) {
//                         const owner_name = result['owner_names'][i];
//                         if (i == 0) {
//                             document['Full Name'] = owner_name['fullName'];
//                             document['First Name'] = owner_name['firstName'];
//                             document['Last Name'] = owner_name['lastName'];
//                             document['Middle Name'] = owner_name['middleName'];
//                             document['Name Suffix'] = owner_name['suffix'];
//                             document['Property Address'] = result['Property Address'];
//                             document['Property State'] = 'IA';
//                             document['Owner Occupied'] = result['Owner Occupied'];
//                             document['Mailing Care of Name'] = '';
//                             document['Mailing Address'] = result['Mailing Address'];
//                             document['Mailing City'] = result['Mailing City'];
//                             document['Mailing State'] = result['Mailing State'];
//                             document['Mailing Zip'] = result['Mailing Zip'];
//                             document['Mailing Unit #'] = '';
//                             document['Property Type'] = result['Property Type'];
//                             document['Total Assessed Value'] = result['Total Assessed Value'];
//                             document['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                             document['Last Sale Amount'] = result['Last Sale Amount'];
//                             document['Est. Remaining balance of Open Loans'] = '';
//                             document['Est Value'] = result['Est. Value'];
//                             document['Effective Year Built'] = result['Effective Year Built'];
//                             document['Est Equity'] = '';
//                             document.propertyAppraiserProcessed = true;
//                             console.log(document);
//                             await document.save();
//                         } else {
//                             let newDocument = await this.cloneMongoDocument(document)
//                             newDocument['Full Name'] = owner_name['fullName'];
//                             newDocument['First Name'] = owner_name['firstName'];
//                             newDocument['Last Name'] = owner_name['lastName'];
//                             newDocument['Middle Name'] = owner_name['middleName'];
//                             newDocument['Name Suffix'] = owner_name['suffix'];
//                             console.log(newDocument);
//                             await newDocument.save();
//                         }
//                     }

//                 }
//             } catch (e) {
//                 if (this.searchBy === 'name')
//                     console.log('Owner not found: ', owner_name)
//                 else
//                     console.log('Address not found: ', document["Property Address"])
//             }
//             await page.goto('http://web.assess.co.polk.ia.us/cgi-bin/web/tt/infoqry.cgi?tt=home/index');
//         }
//         return true;
//     }
// }

