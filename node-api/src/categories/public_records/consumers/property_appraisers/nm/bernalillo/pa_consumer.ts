// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import {IPublicRecordAttributes} from '../../../../../../models/public_record_attributes';
// import puppeteer from "puppeteer";
// const nameParsingService = require('../../consumer_dependencies/nameParsingService');
// const addressService = require('../../consumer_dependencies/addressService');
// const parser = require('parse-address');

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'http://assessor.bernco.gov/public.access/search/commonsearch.aspx?mode=realprop',
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="inpNo"]',
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async getTextByXpathFromPage(page: puppeteer.Page, xPath: string) {
//         const [elm] = await page.$x(xPath)
//         if (elm == null) {
//             return null;
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');
//     }

//     async parsePage(page: puppeteer.Page, propertyAddress: string) {
//         const rawOwnerName = await this.getTextByXpathFromPage(page, '//*[@id="Current Owner"]//*[text()="Owner"]/following-sibling::td[1]');
//         const processedNamesArray = await nameParsingService.parseOwnersFullNameWithoutComma(rawOwnerName);
//         const {state, city, zip, fullAddress} = await this.getAndParseAddress(page);
//         let isOwnerOccupied = addressService.comparisonAddresses(fullAddress, propertyAddress)
//         const propertyType = await this.getTextByXpathFromPage(page, '//*[@id="Class"]//*[text()="Class"]/following-sibling::td[1]');
//         const yearBuild = await this.getTextByXpathFromPage(page, '//*[@id="Real Property Attributes"]//*[text()="Year Built"]/following-sibling::td[1]');
//         const [valuesElement] = await page.$x('//*[@id="sidemenu"]//*[text()="Values"]/parent::a');
//         await valuesElement.click();
//         await page.waitForSelector('#datalet_div_3');
//         const grossAssessedValue = await this.getTextByXpathFromPage(page, '//*[@id="Net Taxable Value"]//*[text()="Class"]/following-sibling::td[1]');
//         const estValue = await this.getTextByXpathFromPage(page, '//*[@id="Values"]//*[text()="Full Total Value"]/following-sibling::td[1]');
//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property City': '',
//             'Property State': 'New Mexico',
//             'Property Zip': '',
//             'County': 'Bernalillo',
//             'Owner Occupied': isOwnerOccupied,
//             'Mailing Care of Name': '',
//             'Mailing Address': fullAddress,
//             'Mailing Unit #': '',
//             'Mailing City': city,
//             'Mailing State': state,
//             'Mailing Zip': zip,
//             'Property Type': propertyType ? propertyType : '',
//             'Total Assessed Value': grossAssessedValue ? grossAssessedValue : '',
//             'Last Sale Recoding Date': '',
//             'Last Sale Amount': '',
//             'Est. Value': estValue,
//             'Effective Year Built': yearBuild,
//             'Est. Equity': '',
//         };
//     }

//     async readDocsToParse() {
//         const docsToParse = await this.getDocumentsArrayFromMongo(this.state, this.county, this.categories);
//         return docsToParse;
//     }

//     async getAndParseAddress(page: puppeteer.Page) {
//         const mailingAddress = await this.getTextByXpathFromPage(page, '//*[@id="Current Owner"]//*[text()="Owner Mailing Address"]/following-sibling::td[1]');
//         const city = await this.getTextByXpathFromPage(page, '//*[@id="Current Owner"]//*[text()="City"]/following-sibling::td[1]');
//         const state = await this.getTextByXpathFromPage(page, '//*[@id="Current Owner"]//*[text()="State"]/following-sibling::td[1]');
//         let mailingZip = await this.getTextByXpathFromPage(page, '//*[@id="Current Owner"]//*[text()="Zip Code"]/following-sibling::td[1]');
//         const foreignMailingAddress = await this.getTextByXpathFromPage(page, '//*[@id="Current Owner"]//*[text()="Foreign Mailling Address"]/following-sibling::td[1]');
//         const fullAddress = `${foreignMailingAddress && foreignMailingAddress !== '\xa0' ? foreignMailingAddress : mailingAddress} ${city}, ${state} ${mailingZip}`;
//         const zip = /^(\d{5})/.exec(mailingZip)![1];
//         return {city, state, zip, fullAddress}
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
//                 const address = parser.parseLocation(document["Property Address"])
//                 await page.waitForSelector('#inpNo');
//                 await page.focus('#inpNo');
//                 await page.keyboard.type(address.number);
//                 await page.focus('#inpStreet');
//                 await page.keyboard.type(address.street);
//                 await page.click('#btSearch');
//                 await page.waitForSelector('#wrapper');
//                 const locationPath = await page.evaluate(() => window.location.pathname);
//                 if (locationPath != '/public.access/Datalets/Datalet.aspx') {
//                     await page.waitForSelector('#searchResults');
//                     const elements = await page.$$('tr.SearchResults');
//                     if (elements.length < 4) {
//                         for (let j = 0; j < elements.length; j++) {
//                             await page.waitForSelector('#searchResults');
//                             const element = (await page.$$('tr.SearchResults'))[j];
//                             await element.click();
//                             try {
//                                 await page.waitForSelector('#datalet_header_row');
//                                 const result = await this.parsePage(page, document["Property Address"]);
//                                 for (let index = 0; index < result['owner_names'].length; index++) {
//                                     const owner_name = result['owner_names'][index];
//                                     if (index == 0 && j == 0) {
//                                         document['Full Name'] = owner_name['fullName'];
//                                         document['First Name'] = owner_name['firstName'];
//                                         document['Last Name'] = owner_name['lastName'];
//                                         document['Middle Name'] = owner_name['middleName'];
//                                         document['Name Suffix'] = owner_name['suffix'];
//                                         document['Owner Occupied'] = result['Owner Occupied'];
//                                         document['Mailing Care of Name'] = '';
//                                         document['Mailing Address'] = result['Mailing Address'];
//                                         document['Mailing City'] = result['Mailing City'];
//                                         document['Mailing State'] = result['Mailing State'];
//                                         document['Mailing Zip'] = result['Mailing Zip'];
//                                         document['Mailing Unit #'] = '';
//                                         document['Property Type'] = result['Property Type'];
//                                         document['Total Assessed Value'] = result['Total Assessed Value'];
//                                         document['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                         document['Last Sale Amount'] = result['Last Sale Amount'];
//                                         document['Est. Remaining balance of Open Loans'] = '';
//                                         document['Est Value'] = result['Est. Value'];
//                                         document['Effective Year Built'] = result['Effective Year Built'];
//                                         document['Est Equity'] = '';
//                                         document.propertyAppraiserProcessed = true;
//                                         await document.save();
//                                     } else {
//                                         let newDocument = await this.cloneMongoDocument(document)
//                                         newDocument['Full Name'] = owner_name['fullName'];
//                                         newDocument['First Name'] = owner_name['firstName'];
//                                         newDocument['Last Name'] = owner_name['lastName'];
//                                         newDocument['Middle Name'] = owner_name['middleName'];
//                                         newDocument['Name Suffix'] = owner_name['suffix'];
//                                         newDocument['Owner Occupied'] = result['Owner Occupied'];
//                                         newDocument['Mailing Care of Name'] = '';
//                                         newDocument['Mailing Address'] = result['Mailing Address'];
//                                         newDocument['Mailing City'] = result['Mailing City'];
//                                         newDocument['Mailing State'] = result['Mailing State'];
//                                         newDocument['Mailing Zip'] = result['Mailing Zip'];
//                                         newDocument['Mailing Unit #'] = '';
//                                         newDocument['Property Type'] = result['Property Type'];
//                                         newDocument['Total Assessed Value'] = result['Total Assessed Value'];
//                                         newDocument['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                         newDocument['Last Sale Amount'] = result['Last Sale Amount'];
//                                         newDocument['Est. Remaining balance of Open Loans'] = '';
//                                         newDocument['Est Value'] = result['Est. Value'];
//                                         newDocument['Effective Year Built'] = result['Effective Year Built'];
//                                         newDocument['Est Equity'] = '';
//                                         await newDocument.save();
//                                     }
//                                 }
//                                 await page.click('#DTLNavigator_searchResultsAnchor');
//                                 await page.waitForSelector('#searchResults');
//                             } catch (e) {
//                             }

//                         }
//                     } else console.log('Many matches found!');
//                 } else {
//                     await page.waitForSelector('#datalet_header_row');
//                     const result = await this.parsePage(page, document["Property Address"]);
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
//             } catch
//                 (e) {
//                 console.log('Address not found: ', document["Property Address"])
//             }
//             await page.goto('http://assessor.bernco.gov/public.access/search/commonsearch.aspx?mode=realprop');
//         }
//         return true;
//     }
// }

