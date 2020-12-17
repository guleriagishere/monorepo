// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import {IPublicRecordAttributes} from '../../../../../../models/public_record_attributes';
// import puppeteer from "puppeteer";

// const nameParsingService = require('../../consumer_dependencies/nameParsingService');
// const getPdfData = require("../../consumer_dependencies/pdfProcess");
// const parser = require('parse-address');

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'http://burleigh.northdakotaassessors.com/search.php',
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="iHouseNum"]',
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async finderUrls(page: puppeteer.Page) {
//         try {
//             await page.waitForSelector('#resultsWrapper', {timeout: 5000});
//             return await page.evaluate(() => {
//                 let options = Array.from(document.querySelectorAll('#pickone > tbody > tr > td:first-child > a'));
//                 // @ts-ignore
//                 return options.map(x => x.href.toString());
//             })
//         } catch (error) {
//             return []
//         }
//     }

//     async getTextByXpathFromPage(page: puppeteer.Page, xPath: string) {
//         const [elm] = await page.$x(xPath)
//         if (elm == null) {
//             return null;
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');
//     }

//     async parsePage(page: puppeteer.Page) {
//         const urlPropertyReportSelector = '//*[@id="pclGeneralInfo"]//*[contains(text(),"Property Report:")]/following-sibling::td[1]/a';
//         const grossAssessedValueRegex = new RegExp(/(?<label>\|\s+Total\s+\|\s+)(?<value>.*?)$/);
//         const lastSaleRegexBefore = new RegExp(/\s+\|\s+Land\s+\|\s+/);
//         const lastSaleRegex = new RegExp(/\|\s+(?<value>\d\d\/\d\d\/\d\d\d\d)\s+\|/);

//         const estPriceRegexBefore = new RegExp(/Prior/);
//         const estPriceRegex = new RegExp(/^(?<label1>.*?\s+)\|(?<label2>.*?\s+)\|(?<label3>.*?\s+?)\|(?<label4>.*?\s+)\|(?<label5>.*?\s+)\|(?<value>.*?\s+)\|/);

//         const rawOwnerName = await this.getTextByXpathFromPage(page, '//*[@id="pclGeneralInfo"]//*[contains(text(),"Deed Holder")]/following-sibling::td[1]');
//         const processedNamesArray = nameParsingService.parseOwnersFullName(rawOwnerName);
//         const propertyType = await this.getTextByXpathFromPage(page, '//*[@id="structure"]//*[contains(text(),"Occupancy")]/following-sibling::*[1]');

//         const [urlPropertyReportElement] = await page.$x(urlPropertyReportSelector);
//         const urlDPropertyReport = await page.evaluate((el) => {
//             return el.href;
//         }, urlPropertyReportElement);

//         const property = {
//             grossAssessedValue: grossAssessedValueRegex,
//             lastSale: {
//                 regexTest: lastSaleRegexBefore,
//                 countNextLine: 1,
//                 regexValue: lastSaleRegex,
//             },
//             estimationValue: {
//                 regexTest: estPriceRegexBefore,
//                 countNextLine: 2,
//                 regexValue: estPriceRegex,
//             },
//         };
//         const {grossAssessedValue, lastSale, estimationValue} = await getPdfData.pdfProcessor(urlDPropertyReport, property);
//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property City': '',
//             'Property State': 'North Dakota',
//             'Property Zip': '',
//             'County': 'Burleigh',
//             'Owner Occupied': '',
//             'Mailing Care of Name': '',
//             'Mailing Address': '',
//             'Mailing Unit #': '',
//             'Mailing City': '',
//             'Mailing State': '',
//             'Mailing Zip': '',
//             'Property Type': propertyType,
//             'Total Assessed Value': grossAssessedValue,
//             'Last Sale Recoding Date': lastSale,
//             'Last Sale Amount': '',
//             'Est. Value': estimationValue,
//             'Effective Year Built': '',
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
//                 let address = parser.parseLocation(document["Property Address"]);
//                 await page.waitForSelector('#iHouseNum');
//                 await page.focus('#iHouseNum');
//                 await page.keyboard.type(address.number);
//                 await page.focus('#iaddr');
//                 await page.keyboard.type(address.street);
//                 await page.click('input[type="submit"]');
//                 await page.waitForSelector('#navLinks');
//                 const locationPath = await page.evaluate(() => window.location.pathname);
//                 if (locationPath == '/parcel.php') {
//                     await page.waitForSelector('#pclGeneralInfo');
//                     const result = await this.parsePage(page);
//                     for (let i = 0; i < result['owner_names'].length; i++) {
//                         const owner_name = result['owner_names'][i];
//                         if (i == 0) {
//                             document['Full Name'] = owner_name['fullName'];
//                             document['First Name'] = owner_name['firstName'];
//                             document['Last Name'] = owner_name['lastName'];
//                             document['Middle Name'] = owner_name['middleName'];
//                             document['Name Suffix'] = owner_name['suffix'];
//                             document['Owner Occupied'] = false;
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
//                             document['Effective Year Built'] = '';
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
//                 } else {
//                     const urls = await this.finderUrls(page);
//                     if (urls.length < 4) {
//                         for (let j = 0; j < urls.length; j++) {
//                             await page.goto(urls[j]);
//                             await page.waitForSelector('#pclGeneralInfo');
//                             const result = await this.parsePage(page);
//                             for (let i = 0; i < result['owner_names'].length; i++) {
//                                 const owner_name = result['owner_names'][i];
//                                 if (i == 0 && j == 0) {
//                                     document['Full Name'] = owner_name['fullName'];
//                                     document['First Name'] = owner_name['firstName'];
//                                     document['Last Name'] = owner_name['lastName'];
//                                     document['Middle Name'] = owner_name['middleName'];
//                                     document['Name Suffix'] = owner_name['suffix'];
//                                     document['Owner Occupied'] = false;
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
//                                     document.propertyAppraiserProcessed = true;
//                                     await document.save();
//                                 } else {
//                                     let newDocument = await this.cloneMongoDocument(document)
//                                     newDocument['Full Name'] = owner_name['fullName'];
//                                     newDocument['First Name'] = owner_name['firstName'];
//                                     newDocument['Last Name'] = owner_name['lastName'];
//                                     newDocument['Middle Name'] = owner_name['middleName'];
//                                     newDocument['Name Suffix'] = owner_name['suffix'];
//                                     newDocument['Owner Occupied'] = false;
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
//                                     await newDocument.save();
//                                 }
//                             }
//                         }
//                     } else console.log('Many matches found!');
//                 }
//             } catch (e) {
//                 console.log('Address not found: ', document["Property Address"])
//             }
//             await page.goto('http://burleigh.northdakotaassessors.com/search.php');
//         }
//         return true;
//     }
// }