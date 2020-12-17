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
//         propertyAppraiserPage: 'https://multcoproptax.com/Property-Search',
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="dnn_ctr410_MultnomahGuestView_SearchTextBox"]',
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
//         const {number, street} = address
//         try {
//             ids = await page.evaluate(({number, street}) => {
//                 // @ts-ignore
//                 const elementData = JSON.parse(document.getElementById('dnn_ctr410_MultnomahGuestView_SearchResultJson').value);
//                 let arrayFilterMatchData = elementData.ResultList.filter((data: { SitusAddress: string; }) => {
//                     const reg = new RegExp(`\\b(?<number>${number})\\b.*(?<street>${street})`, 'i');
//                     const match = reg.exec(data.SitusAddress);
//                     return !!(match && match.groups && match.groups.number && match.groups.street);
//                 })
//                 return arrayFilterMatchData.map((e: { OwnerQuickRefID: any; }) => e.OwnerQuickRefID);
//             }, {number, street});
//         } catch (e) {
//             console.log(e);
//         }
//         return ids;
//     }

//     async parsePage(page: puppeteer.Page, propertyAddress: string) {
//         await page.waitForXPath('//*[contains(@id, "OwnersLabel")]');
//         const rawOwnerName = await this.getTextByXpathFromPage(page, '//*[contains(@id, "OwnersLabel")]');
//         const processedNamesArray = nameParsingService.parseOwnersFullName(rawOwnerName);
//         let address: string = await this.getAddress(page, '//*[contains(@id, "MailingAddress")]');
//         const addressMatch = address.match(/\n/g)
//         if (addressMatch!.length > 1) {
//             address = address.replace(/^.*\n/, '')
//             address.trim()
//         }
//         const {state, city, zip} = addressService.parsingDelimitedAddress(address);
//         address = address.replace(/\n/g, ' ')
//         const isOwnerOccupied = addressService.comparisonAddresses(address, propertyAddress);
//         const propertyType = await this.getTextByXpathFromPage(page, '//*[contains(@id, "PropertyUse")]');
//         const grossAssessedValue = await this.getTextByXpathFromPage(page, '//*[contains(@id, "ValueHistoryDataRP")]//tr[not(@class="tableHeaders")][1]/td[last()]');
//         const lastSaleDate = await this.getTextByXpathFromPage(page, '//*[contains(@id, "SalesHistoryData")]//tr[not(@class="tableHeaders")][1]/td[last()-1]');
//         const lastSaleAmount = await this.getTextByXpathFromPage(page, '//*[contains(@id, "SalesHistoryData")]//tr[not(@class="tableHeaders")][1]/td[last()]');
//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property City': '',
//             'Property State': 'Oregon',
//             'Property Zip': '',
//             'County': 'Multnomah',
//             'Owner Occupied': isOwnerOccupied,
//             'Mailing Care of Name': '',
//             'Mailing Address': address,
//             'Mailing Unit #': '',
//             'Mailing City': city,
//             'Mailing State': state,
//             'Mailing Zip': zip,
//             'Property Type': propertyType,
//             'Total Assessed Value': grossAssessedValue ? grossAssessedValue : '',
//             'Last Sale Recoding Date': lastSaleDate,
//             'Last Sale Amount': lastSaleAmount,
//             'Est. Value': '',
//             'Effective Year Built': '',
//             'Est. Equity': '',
//         };
//     }


//     async getAddress(page: puppeteer.Page, xPath: string) {
//         const [elm] = await page.$x(xPath);
//         if (elm == null) {
//             return '';
//         }
//         return await page.evaluate(j => j.textContent, elm);
//     };

//     async readDocsToParse() {
//         const docsToParse = await this.getDocumentsArrayFromMongo(this.state, this.county, this.categories);
//         return docsToParse;
//     }

//     async getTextByXpathFromPage(page: puppeteer.Page, xPath: string) {
//         const [elm] = await page.$x(xPath)
//         if (elm == null) {
//             return null;
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');
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
//                 const searchAddress = document["Property Address"].replace(/\b(?:#|Apt)\b/gi, 'UNIT')
//                 await page.goto('https://multcoproptax.com/Property-Search');
//                 await page.waitForSelector('#dnn_ctr410_MultnomahGuestView_SearchTextBox');
//                 await page.focus('#dnn_ctr410_MultnomahGuestView_SearchTextBox');
//                 await page.keyboard.type(searchAddress);
//                 await page.click('#SearchButtonDiv');
//                 await page.waitForSelector('#grid');
//                 try {
//                     let ids = await this.finderId(page, address)
//                     if (ids.length < 4) {
//                         for (let j = 0; j < ids.length; j++) {
//                             const [elem] = await page.$x(`//*[contains(text(), "${ids[j]}")]`);
//                             await elem.click();
//                             const result = await this.parsePage(page, document["Property Address"]);
//                             for (let index = 0; index < result['owner_names'].length; index++) {
//                                 const owner_name = result['owner_names'][index];
//                                 if (index == 0 && j == 0) {
//                                     document['Full Name'] = owner_name['fullName'];
//                                     document['First Name'] = owner_name['firstName'];
//                                     document['Last Name'] = owner_name['lastName'];
//                                     document['Middle Name'] = owner_name['middleName'];
//                                     document['Name Suffix'] = owner_name['suffix'];
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
//                                     newDocument['Effective Year Built'] = '';
//                                     newDocument['Est Equity'] = '';
//                                     await newDocument.save();
//                                 }
//                             }
//                             await page.goBack();
//                             await page.waitForSelector('#grid');
//                         }
//                     } else {
//                         console.log('Many matches found!')
//                     }
//                 } catch (error) {
//                     console.log(error)
//                 }
//             } catch (e) {
//                 console.log('Address not found: ', document["Property Address"])
//             }
//         }
//         return true;
//     }
// }