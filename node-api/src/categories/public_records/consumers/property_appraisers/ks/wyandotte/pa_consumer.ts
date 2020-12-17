// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import {IPublicRecordAttributes} from '../../../../../../models/public_record_attributes'
// import puppeteer from "puppeteer";
// import _ from 'lodash'

// const parser = require('parse-address');
// const getPdfData = require("../../consumer_dependencies/pdfProcess");
// const nameParsingService = require('../../consumer_dependencies/nameParsingService')
// const addressService = require('../../consumer_dependencies/addressService')

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'http://appr.wycokck.org/appraisal/publicaccess/PropertySearch.aspx?PropertySearchType=3',
//         searchByNamePage: 'http://appr.wycokck.org/appraisal/publicaccess/PropertySearch.aspx?PropertySearchType=2'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="StreetNumber"]',
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async finderIds(page: puppeteer.Page, owner_name_regexp: string) {
//         const idRegexString = '(\\d+)';
//         const idSelector = 'body > table > tbody > tr:last-child > td:last-child > table > tbody > tr:last-child > td > table > tbody > tr > td:first-child > label';
//         const nameSelector = 'body > table > tbody > tr:last-child > td:last-child > table > tbody > tr:last-child > td > table > tbody > tr > td:nth-child(2)';

//         let dataOwnerIds = await page.evaluate(async ({idRegexString, idSelector, nameSelector}: any) => {
//             let options = Array.from(document.querySelectorAll(idSelector));
//             let names = Array.from(document.querySelectorAll(nameSelector));
//             let ids: { single: any, multiple: any } = {
//                 single: [],
//                 multiple: [],
//             };
//             for (let i = 0; i < options.length; i++) {
//                 let x: any = options[i];
//                 const name = names[i].textContent;
//                 const idRegex = new RegExp(idRegexString, 'g');
//                 const match: any = x.onclick.toString().match(idRegex);
//                 if (match[0] !== '1') {
//                     ids.multiple.push({id: match[2]});
//                 } else {
//                     ids.single.push({propertyId: match[2], propertyOwnerId: match[1], name});
//                 }
//             }
//             return ids
//         }, {idRegexString, idSelector, nameSelector});

//         let idsOwnerArray = [...dataOwnerIds.single];

//         if (dataOwnerIds.multiple.length) {
//             for (let i = 0; i < dataOwnerIds.multiple.length; i++) {
//                 const multipleIds = await this.getMultipleOwnersIds(page, dataOwnerIds.multiple[i]);
//                 idsOwnerArray.push(...multipleIds);
//             }
//         }
//         if (this.searchBy === 'name') {
//             idsOwnerArray = idsOwnerArray.filter(x => {
//                 const regexp = new RegExp(owner_name_regexp);
//                 return regexp.exec(x.name.toUpperCase());
//             });
//         }
//         return _.uniqWith(idsOwnerArray, _.isEqual);
//     }

//     async getMultipleOwnersIds(page: puppeteer.Page, propertyId: string) {
//         const idRegexString = '(\\d+)';
//         const idMultipleSelector = 'body > table > tbody > tr > td > table > tbody > tr:nth-child(4) > td > table > tbody > tr > td:first-child > label';

//         await page.goto(`http://appr.wycokck.org/appraisal/publicaccess/SelectPropertyOwner.aspx?PropertyID=${propertyId}&TaxYear=2020&dbKeyAuth=Appraisal&NodeID=11`, {waitUntil: 'domcontentloaded'});
//         return await page.evaluate(async ({idRegexString, idMultipleSelector}) => {
//             let options = Array.from(document.querySelectorAll(idMultipleSelector));
//             return options.map(x => {
//                 const idRegex = new RegExp(idRegexString, 'g');
//                 const match = x.onclick.toString().match(idRegex);
//                 const name = x.textContent;
//                 return {propertyId: match[0], propertyOwnerId: match[1], name}
//             })
//         }, {idRegexString, idMultipleSelector});
//     }

//     async parsePage(page: puppeteer.Page, propertyAddress: string, id: any) {
//         const propClassRegex = new RegExp(/(?<label>Prop Class:\s+\|)(?<value>.*?)\|/g);
//         const estPriceRegex = new RegExp(/(?<label>Total Market Land Value\s+\|)(?<value>.+)/g)
//         const urlDatasheetSelector = '//a[contains(text(), "Datasheet")]'

//         await page.goto(`http://appr.wycokck.org/appraisal/publicaccess/PropertyDetail.aspx?PropertyID=${id.propertyId}&dbKeyAuth=Appraisal&TaxYear=${new Date().getFullYear()}&NodeID=11&PropertyOwnerID=${id.propertyOwnerId}`);
//         await page.waitForSelector('.ssPageTitle');
//         const rawOwnerName = await this.getOrdinalTableText(page, 'Owner Name');
//         const processedNamesArray = nameParsingService.parseOwnersFullName(rawOwnerName);
//         let address = await this.getAddress(page, 'Owner Address');
//         const {state, city, zip} = addressService.parsingDelimitedAddress(address);
//         address = address.replace(/\n/g, ' ')

//         let propertyCity = '';
//         let propertyZip = '';
//         if (this.searchBy === 'name') {
//             propertyAddress = await this.getPropertyAddress(page, 'Property Address:');
//             const {state, city, zip} = addressService.parsingDelimitedAddress(propertyAddress);
//             propertyAddress = propertyAddress.replace(/\n|\s+/gm, ' ').trim();
//             propertyCity = city;
//             propertyZip = zip;
//         }
//         const grossAssessedValue = await this.getBreakdownTableText(page);
//         const ownerOccupied = addressService.comparisonAddresses(address, propertyAddress);
//         await page.waitForXPath(urlDatasheetSelector);
//         const [urlDatasheetElement] = await page.$x(urlDatasheetSelector);
//         const urlDatasheet = await page.evaluate((el) => {
//             return el.href
//         }, urlDatasheetElement);

//         const property = {
//             propertyType: propClassRegex,
//             estimationValue: estPriceRegex,
//         };
//         const {propertyType, estimationValue} = await getPdfData.pdfProcessor(urlDatasheet, property);

//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property Address': propertyAddress,
//             'Property City': propertyCity,
//             'Property State': 'Kansas',
//             'Property Zip': propertyZip,
//             'County': 'Wyandotte',
//             'Owner Occupied': ownerOccupied,
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
//             'Effective Year Built': '',
//             'Est. Equity': '',
//         };
//     }

//     async getOrdinalTableText(page: puppeteer.Page, label: string) {
//         const selector = `//*[@valign="top"]//td[contains(text(), "${label}")]/following-sibling::td[1]`;
//         const [elm] = await page.$x(selector);
//         if (elm == null) {
//             return '';
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');


//     };

//     async getAddress(page: puppeteer.Page, label: string) {
//         const selector = `//*[@valign="top"]//td[contains(text(), "${label}")]/following-sibling::td[1]`;
//         const [elm] = await page.$x(selector);
//         if (elm == null) {
//             return '';
//         }
//         return await page.evaluate(j => j.innerText, elm);
//     };

//     async getPropertyAddress(page: puppeteer.Page, label: string) {
//         const selector = `//*[text()="${label}"]/following-sibling::td`;
//         const [elm] = await page.$x(selector);
//         if (elm == null) {
//             return '';
//         }
//         return await page.evaluate(j => j.innerText, elm);
//     }

//     async getBreakdownTableText(page: puppeteer.Page) {
//         const selector = `//*[@class="ssDetailData"]/table/tbody/tr[3]/td[1]/table/tbody/tr/td[3]`;
//         const [elm] = await page.$x(selector);
//         if (elm == null) {
//             return '';
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');
//     };

//     async readDocsToParse() {
//         const docsToParse = await this.getDocumentsArrayFromMongo(this.state, this.county, this.categories);
//         return docsToParse;
//     }

//     parseAddress(fullAddress: string) {
//         try {
//             const splitedAddress = fullAddress.split('\n')
//             const match = /^(.*?)\s*,\s*([A-Z]{2})\s*([\d\-]+)$/.exec(splitedAddress![1])
//             const normalizeZip = /^(\d{5})/.exec(match![3])![1]
//             return {city: match![1], zip: normalizeZip, state: match![2]};
//         } catch (e) {
//             return {city: '', zip: '', state: ''};
//         }
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
//         for (let document of docsToParse) {
//             this.searchBy = document["Property Address"] ? 'address' : 'name';
//             try {
//                 const url = this.searchBy==='name' ? this.urls.searchByNamePage : this.urls.propertyAppraiserPage;
//                 await page.goto(url);

//                 let searchAddress = parser.parseLocation(document["Property Address"]);
//                 let first_name = '';
//                 let last_name = '';
//                 let owner_name = '';
//                 let owner_name_regexp = '';
    
//                 if (this.searchBy === 'name') {
//                     const nameInfo = this.getNameInfo(document);
//                     first_name = nameInfo.first_name;
//                     last_name = nameInfo.last_name;
//                     owner_name = nameInfo.owner_name;
//                     owner_name_regexp = nameInfo.owner_name_regexp;
//                     if (owner_name === '') continue;
//                     console.log(`Looking for owner: ${owner_name}`);

//                     await page.focus('#NameLast');
//                     await page.keyboard.type(last_name);
//                     await page.focus('#NameFirst');
//                     await page.keyboard.type(first_name);
//                 }
//                 else {
//                     searchAddress = parser.parseLocation(document["Property Address"]);
//                     searchAddress.street = searchAddress.street.replace(/\b(?:N|S|W|E|East|West|North|South)\b/gi, '');
//                     searchAddress.street.trim()
//                     console.log(`Looking for address: ${document["Property Address"]}`);

//                     await page.waitForSelector('#StreetNumber');
//                     await page.focus('#StreetNumber');
//                     await page.keyboard.type(searchAddress.number);
//                     await page.focus('#StreetName');
//                     await page.keyboard.type(searchAddress.street);
//                     await page.click('#cbxExact')
//                     await page.focus('#City');
//                     await page.keyboard.type(document["Property City"]);
//                     await page.focus('#ZipCode');
//                     await page.keyboard.type(document["Property Zip"]);
//                 }
//                 await page.click('#SearchSubmit')

                
//                 try {
//                     await page.waitForSelector('.ssMessageCountTitle', {timeout: 10000})
//                     let ids = await this.finderIds(page, owner_name_regexp)
//                     if (ids.length < 4) {
//                         for (let j = 0; j < ids.length; j++) {
//                             const result = await this.parsePage(page, document["Property Address"], ids[j]);
//                             for (let index = 0; index < result['owner_names'].length; index++) {
//                                 const owner_name = result['owner_names'][index];
//                                 if (index == 0 && j == 0) {
//                                     document['Full Name'] = owner_name['fullName'];
//                                     document['First Name'] = owner_name['firstName'];
//                                     document['Last Name'] = owner_name['lastName'];
//                                     document['Middle Name'] = owner_name['middleName'];
//                                     document['Name Suffix'] = owner_name['suffix'];
//                                     document['Owner Occupied'] = result['Owner Occupied'];
//                                     if (this.searchBy === 'name') {
//                                         document['Property Address'] = result['Property Address'];
//                                         document['Property City'] = result['Property City'];
//                                         document['Property State'] = result['Property State'];
//                                         document['Property Zip'] = result['Mailing Zip'];    
//                                     }
//                                     document['Mailing Care of Name'] = '';
//                                     document['Mailing Address'] = result['Mailing Address'];
//                                     document['Mailing City'] = result['Mailing City'];
//                                     document['Mailing State'] = result['Mailing State'];
//                                     document['Mailing Zip'] = result['Mailing Zip'];
//                                     document['Mailing Unit #'] = '';
//                                     document['Property Type'] = result['Property Type'];
//                                     document['Total Assessed Value'] = result['Total Assessed Value'];
//                                     document['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                     document['Last Sale Amount'] = result['Last Sale Amount'];
//                                     document['Est. Remaining balance of Open Loans'] = '';
//                                     document['Est Value'] = result['Est. Value'];
//                                     document['Effective Year Built'] = '';
//                                     document['Est Equity'] = '';
//                                     console.log(document)
//                                     document.propertyAppraiserProcessed = true;
//                                     await document.save();
//                                 } else {
//                                     let newDocument = await this.cloneMongoDocument(document)
//                                     newDocument['Full Name'] = owner_name['fullName'];
//                                     newDocument['First Name'] = owner_name['firstName'];
//                                     newDocument['Last Name'] = owner_name['lastName'];
//                                     newDocument['Middle Name'] = owner_name['middleName'];
//                                     newDocument['Name Suffix'] = owner_name['suffix'];
//                                     newDocument['Owner Occupied'] = result['Owner Occupied'];
//                                     if (this.searchBy === 'name') {
//                                         newDocument['Property Address'] = result['Property Address'];
//                                         newDocument['Property City'] = result['Property City'];
//                                         newDocument['Property State'] = result['Property State'];
//                                         newDocument['Property Zip'] = result['Mailing Zip'];    
//                                     }
//                                     newDocument['Mailing Care of Name'] = '';
//                                     newDocument['Mailing Address'] = result['Mailing Address'];
//                                     newDocument['Mailing City'] = result['Mailing City'];
//                                     newDocument['Mailing State'] = result['Mailing State'];
//                                     newDocument['Mailing Zip'] = result['Mailing Zip'];
//                                     newDocument['Mailing Unit #'] = '';
//                                     newDocument['Property Type'] = result['Property Type'];
//                                     newDocument['Total Assessed Value'] = result['Total Assessed Value'];
//                                     newDocument['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                     newDocument['Last Sale Amount'] = result['Last Sale Amount'];
//                                     newDocument['Est. Remaining balance of Open Loans'] = '';
//                                     newDocument['Est Value'] = result['Est. Value'];
//                                     newDocument['Effective Year Built'] = '';
//                                     newDocument['Est Equity'] = '';
//                                     console.log(newDocument)
//                                     await newDocument.save();
//                                 }
//                             }
//                         }
//                     } else console.log('Many matches found!')
//                 } catch (error) {
//                 }
//             } catch (e) {
//                 console.log('Address not found: ', document["Property Address"])
//             }
//         }
//         return true;
//     }
// }