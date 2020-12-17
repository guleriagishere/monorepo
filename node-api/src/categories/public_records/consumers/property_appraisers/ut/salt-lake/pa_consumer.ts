// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import {IPublicRecordAttributes} from '../../../../../../models/public_record_attributes';
// import puppeteer from "puppeteer";

// const nameParsingService = require('../../consumer_dependencies/nameParsingService')
// const parser = require('parse-address');

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://slco.org/assessor/new/query.cfm',
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="parcelsearch"]',
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async finderId(page: puppeteer.Page, address: any) {
//         let ids = [];
//         try {
//             const elementsId = await page.$x('//*[@class="resultsWhite" or @class="resultsGrey"]');
//             for (let i = 0; i < elementsId.length; i++) {
//                 let element = elementsId[i];
//                 let [addressElement] = await element.$x(`//a[@id="detailType${i + 1}"]`);
//                 let addressString = (await addressElement.evaluate(e => e.innerHTML)).replace('&nbsp;', '');
//                 const reg = new RegExp(address, 'i')
//                 let matchSuccess = reg.test(addressString)
//                 if (matchSuccess) {
//                     let [idElement] = await element.$x(`//*[@id="checkBox${i + 1}"]`);
//                     // @ts-ignore
//                     const id = await idElement.evaluate((e) => e.value);
//                     ids.push(id);
//                 }
//             }
//         } catch (e) {
//         }
//         return ids;
//     }

//     async getTextByXpathFromPage(page: puppeteer.Page, xPath: string) {
//         const [elm] = await page.$x(xPath)
//         if (elm == null) {
//             return '';
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');
//     }

//     async parsePage(page: puppeteer.Page) {
//         const rawOwnerName = await this.getTextByXpathFromPage(page, '//*[@id="parcelFieldNames"]//*[contains(text(), "Owner")]/following-sibling::td[1]');
//         const processedNamesArray = await nameParsingService.semicolonParseOwnersFullName(rawOwnerName);
//         const propertyType = await this.getTextByXpathFromPage(page, '//*[@id="parcelFieldNames"]//*[contains(text(), "Property Type")]/following-sibling::td[1]/a');

//         const estimationValue = await this.getTextByXpathFromPage(page, '//*[@id="parcelFieldNames"]//*[contains(text(), "Market Value")]/following-sibling::td[1]');
//         const yearBuild = await this.getTextByXpathFromPage(page, '//*[@id="residencetable"]//*[contains(text(), "Effective Year Built")]/div/a');
//         let isOwnerOccupied = await this.getTextByXpathFromPage(page, '//*[@id="residencetable"]//*[contains(text(), "Owner Occupied")]/div/a');

//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property City': '',
//             'Property State': 'Utah',
//             'Property Zip': '',
//             'County': 'Salt Lake',
//             'Owner Occupied': isOwnerOccupied == 'Y',
//             'Mailing Care of Name': '',
//             'Mailing Address': '',
//             'Mailing Unit #': '',
//             'Mailing City': '',
//             'Mailing State': '',
//             'Mailing Zip': '',
//             'Property Type': propertyType ? propertyType : '',
//             'Total Assessed Value': '',
//             'Last Sale Recoding Date': '',
//             'Last Sale Amount': '',
//             'Est. Value': estimationValue,
//             'Effective Year Built': yearBuild,
//             'Est. Equity': '',
//         };
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

//         for (let document of docsToParse) {
//             try {
//                 const address = parser.parseLocation(document["Property Address"]);
//                 address.street = address.street.replace(/\b(?:N|S|W|E|East|West|North|South)\b/gi, '').trim();
//                 await page.waitForSelector('#parcelsearch');
//                 const [collapseAddressSearch] = await page.$x('//a[contains(text(), "Address Search")]');
//                 await collapseAddressSearch.click();
//                 if (address.number) {
//                     await page.type('#street_Num', address.number, {delay: 50});
//                 }
//                 await page.type('#street_name', address.street, {delay: 50});
//                 await page.click('#SubmitAddress');
//                 await page.waitForSelector('#mainContentArea');
//                 const locationPath = await page.evaluate(() => window.location.pathname);

//                 if (locationPath === '/assessor/new/resultsMain.cfm') {
//                     await page.waitForSelector('#resultsDiv');
//                     const ids = await this.finderId(page, document["Property Address"]);
//                     if (ids.length < 4) {
//                         for (let j = 0; j < ids.length; j++) {
//                             await page.goto(`https://slco.org/assessor/new/valuationInfoExpanded.cfm?Parcel_id=${ids[j]}`);
//                             await page.waitForSelector('#detailDiv');
//                             const result = await this.parsePage(page);
//                             for (let index = 0; index < result['owner_names'].length; index++) {
//                                 const owner_name = result['owner_names'][index];
//                                 if (index == 0 && j == 0) {
//                                     document['Full Name'] = owner_name['fullName'] ? owner_name['fullName'] : '';
//                                     document['First Name'] = owner_name['firstName'];
//                                     document['Last Name'] = owner_name['lastName'];
//                                     document['Middle Name'] = owner_name['middleName'];
//                                     document['Name Suffix'] = owner_name['suffix'] ? owner_name['suffix'] : '';
//                                     document['Owner Occupied'] = result['Owner Occupied'];
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
//                                     document['Effective Year Built'] = result['Effective Year Built'];
//                                     document['Est Equity'] = '';
//                                     document.propertyAppraiserProcessed = true;
//                                     await document.save();
//                                 } else {
//                                     let newDocument = await this.cloneMongoDocument(document)
//                                     newDocument['Full Name'] = owner_name['fullName'] ? owner_name['fullName'] : '';
//                                     newDocument['First Name'] = owner_name['firstName'];
//                                     newDocument['Last Name'] = owner_name['lastName'];
//                                     newDocument['Middle Name'] = owner_name['middleName'];
//                                     newDocument['Name Suffix'] = owner_name['suffix'] ? owner_name['suffix'] : '';
//                                     newDocument['Owner Occupied'] = result['Owner Occupied'];
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
//                                     newDocument['Effective Year Built'] = result['Effective Year Built'];
//                                     newDocument['Est Equity'] = '';
//                                     await newDocument.save();
//                                 }
//                             }
//                         }
//                     } else console.log('Many matches found!');
//                 } else {
//                     await page.waitForSelector('#detailDiv');
//                     const result = await this.parsePage(page);
//                     for (let i = 0; i < result['owner_names'].length; i++) {
//                         const owner_name = result['owner_names'][i];
//                         if (i == 0) {
//                             document['Full Name'] = owner_name['fullName'];
//                             document['First Name'] = owner_name['firstName'];
//                             document['Last Name'] = owner_name['lastName'];
//                             document['Middle Name'] = owner_name['middleName'];
//                             document['Name Suffix'] = owner_name['suffix'];
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
//                             await document.save();
//                         } else {
//                             let newDocument = await this.cloneMongoDocument(document)
//                             newDocument['Full Name'] = owner_name['fullName'];
//                             newDocument['First Name'] = owner_name['firstName'];
//                             newDocument['Last Name'] = owner_name['lastName'];
//                             newDocument['Middle Name'] = owner_name['middleName'];
//                             newDocument['Name Suffix'] = owner_name['suffix'];
//                             await newDocument.save();
//                         }
//                     }
//                 }
//             } catch (e) {
//                 console.log('Address not found: ', document["Property Address"])
//             }
//             await page.goto('https://slco.org/assessor/new/query.cfm');
//         }
//         return true;
//     }
// }