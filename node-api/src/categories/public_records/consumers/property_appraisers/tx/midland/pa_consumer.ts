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
//         propertyAppraiserPage: 'http://iswdataclient.azurewebsites.net/webSearchAddress.aspx?dbkey=midlandcad',
//         searchByNamePage: 'http://iswdataclient.azurewebsites.net/webSearchName.aspx?dbkey=midlandcad'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="ucSearchAddress_searchnumber"]',
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async finderIds(page: puppeteer.Page, address: any) {
//         let ids: string[] = [];
//         const unit = address.sec_unit_num ? address.sec_unit_num : null
//         const idSelector = `//*[@id="dvPrimary"]//td[contains(text(),"${address.street.toUpperCase()}") and contains(text(), " ${address.number}")]/preceding-sibling::td[3]`;
//         try {
//             ids = await page.evaluate((idSelector) => {
//                 let xPathResult = document.evaluate(idSelector, document, null, XPathResult.ANY_TYPE, null);
//                 const elems = [];
//                 let elem = xPathResult.iterateNext();
//                 while (elem) {
//                     elems.push(elem);
//                     elem = xPathResult.iterateNext();
//                 }
//                 return elems.map((item: any) => item.innerHTML);
//             }, idSelector);
//         } catch (e) {
//             console.log(e);
//         }
//         if (unit) {
//             const newIds: string[] = []
//             for (let id of ids) {
//                 const [elem] = await page.$x(`//*[@id="dvPrimary"]//td[contains(text(),"${id}")]/following-sibling::td[4]`)
//                 let text = await page.evaluate(j => j.innerText, elem);
//                 const testRegex = new RegExp(`UNIT: ${unit}`, 'i')
//                 if (testRegex.test(text)) {
//                     newIds.push(id)
//                 }
//             }
//             return newIds
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

//     async getAddress(page: puppeteer.Page, xPath: string) {
//         const [elm] = await page.$x(xPath);
//         if (elm == null) {
//             return '';
//         }
//         return await page.evaluate(j => j.innerText, elm);
//     };

//     async parsePage(page: puppeteer.Page, propertyAddress: any, id: string) {
//         const checkValidAddressRegex = new RegExp(/^(?:,|\b(?:AND|C\/O)\b|&)/);
//         const separateAddressAndNameRegex = new RegExp(/(?<name>\D*)(?<address>\d.+)/);
//         const estPriceRegex = new RegExp(/(?<marketLabel>Market Value:)(?<value>.*?)(?<ProductionMarketLabel>Production Market Value:)/);

//         await page.goto(`http://iswdataclient.azurewebsites.net/webProperty.aspx?dbkey=midlandcad&id=${id}`);
//         await page.waitForSelector('#webprop_name');
//         let rawOwnerName = await this.getTextByXpathFromPage(page, '//td[@id="webprop_name"]');
//         let address = await this.getAddress(page, '//td[@id="webprop_mailaddress"]');
//         if (checkValidAddressRegex.test(address)) {
//             const separateAddress = separateAddressAndNameRegex.exec(address);
//             if (separateAddress && separateAddress.groups) {
//                 rawOwnerName += ` ${separateAddress.groups.name}`;
//                 address = separateAddress.groups.address;
//             }
//         }
//         const processedNamesArray = nameParsingService.parseOwnersFullNameWithoutComma(rawOwnerName);
//         const {state, city, zip} = addressService.parsingDelimitedAddress(address);
//         address = address.replace(/\n/g, ' ')
//         const propertyType = await this.getTextByXpathFromPage(page, '//tbody[@id="tableBld"]/tr[1]/td[3]');
//         const grossAssessedValue = await this.getTextByXpathFromPage(page, '//*[@class="propertyDetails"]//td[contains(text(), "Total Assessed")]/following-sibling::td[2]');
//         const lastSaleDate = await this.getTextByXpathFromPage(page, '//tbody[@id="tableSale"]/tr[1]/td[4]');
//         let isOwnerOccupied = addressService.comparisonAddresses(address, propertyAddress)
//         const textEstimateValue = await this.getTextByXpathFromPage(page, '//*[@id="mktLnd"]');
//         const estMatch = estPriceRegex.exec(textEstimateValue);
//         const estimationValue = estMatch!.groups!.value.trim();
//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property City': '',
//             'Property State': 'Texas',
//             'Property Zip': '',
//             'County': 'Midland',
//             'Owner Occupied': isOwnerOccupied,
//             'Mailing Care of Name': '',
//             'Mailing Address': address,
//             'Mailing Unit #': '',
//             'Mailing City': city,
//             'Mailing State': state,
//             'Mailing Zip': zip,
//             'Property Type': propertyType ? propertyType : '',
//             'Total Assessed Value': grossAssessedValue ? grossAssessedValue : '',
//             'Last Sale Recoding Date': lastSaleDate ? lastSaleDate : '',
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
//     async parseAndSave(docsToParse: any): Promise<boolean> {
//         console.log(`Documents to look up: ${docsToParse.length}.`);
//         const page = this.browserPages.propertyAppraiserPage;
//         if (page === undefined) return false;
//         const parsePropertyAddressRegex = new RegExp(/(?<number>\d+)\s(?<street>.+)/)
//         for (let document of docsToParse) {
//             if (!this.decideSearchByV2(document)) {
//                 console.log('Insufficient info for Owner and Property');
//                 continue;
//             }

//             try {
//                 let first_name = '';
//                 let last_name = '';
//                 let owner_name = '';
//                 let owner_name_regexp = ''; 
//                 let searchAddress = {
//                     number: '',
//                     street: '',
//                     type: '',
//                 };

//                 if (this.searchBy === 'address') {
//                     await page.goto('http://iswdataclient.azurewebsites.net/webSearchAddress.aspx?dbkey=midlandcad');

//                     if (/County Road/i.test(document.propertyId["Property Address"])) {
//                         const match = parsePropertyAddressRegex.exec(document["Property Address"])
//                         if (match && match.groups && match.groups.street) {
//                             searchAddress.number = match.groups.number;
//                             searchAddress.street = match.groups.street;
//                             searchAddress.street = searchAddress.street.replace(/\b(?:N|S|W|E|East|West|North|South|Ofc)\b/gi, '').trim()
//                             searchAddress.street = searchAddress.street.replace('Road', 'RD').trim()
//                         }
//                     } else {
//                         searchAddress = parser.parseLocation(document.propertyId["Property Address"]);
//                         searchAddress.street = searchAddress.street.replace(/\b(?:N|S|W|E|East|West|North|South|Ofc)\b/gi, '');
//                         searchAddress.street.trim()
//                     }
//                     if (!searchAddress.number && !searchAddress.street) throw new Error();
//                     if (searchAddress.number) {
//                         await page.focus('#ucSearchAddress_searchnumber');
//                         await page.keyboard.type(searchAddress.number);
//                     }
//                     await page.focus('#ucSearchAddress_searchstreet');
//                     await page.keyboard.type(searchAddress.street);

//                     await page.click('#ucSearchAddress_ButtonSearch');
//                 }
//                 else {
//                     await page.goto('http://iswdataclient.azurewebsites.net/webSearchName.aspx?dbkey=midlandcad');

//                     const nameInfo = this.getNameInfo(document.ownerId);
//                     first_name = nameInfo.first_name;
//                     last_name = nameInfo.last_name;
//                     owner_name = nameInfo.owner_name;
//                     owner_name_regexp = nameInfo.owner_name_regexp;
//                     if (owner_name === '') continue;
    
//                     await page.focus('#ucSearchName_searchname');
//                     await page.keyboard.type(owner_name);
//                     await page.click('#ucSearchName_ButtonSearch');
//                 }

//                 await page.waitForSelector('#dvPrimary');

//                 let rows: any[];
//                 if (this.searchBy == "address") {
//                     const property_xpath = '//*[@id="dvPrimary"]//td[contains(text(),"' + searchAddress.street.toUpperCase() + '") and contains(text(), "' + searchAddress.number + '")]/parent::tr';
//                     rows = await page.$x(property_xpath);
//                 } else {
//                     rows = await page.$x('//*[@id="dvPrimary"]/table/tbody/tr');
//                     rows.shift();
//                 }

//                 if (rows.length == 0) {
//                     console.log("Not find property");
//                     continue;
//                 }

//                 for (let row of rows) {
//                     let property_address = await row.$eval("td:nth-child(5)", (el: { innerText: any; }) => el.innerText);
//                     let address_units = property_address.split(' ');
//                     const street_number = address_units.pop();
//                     address_units.unshift(street_number);
//                     property_address = address_units.join(' ');
                    
//                     const property_id = await row.$eval("td:nth-child(2)", (el: { innerText: any; }) => el.innerText);

//                     const result = await this.parsePage(page, property_address, property_id);

//                     for (let index = 0; index < result['owner_names'].length; index++) {
//                         const owner_name = result['owner_names'][index];
//                         console.log(owner_name);
//                         if (index == 0) {
//                             let dataFromPropertyAppraisers = {
//                                 'Full Name': owner_name['fullName'],
//                                 'First Name': owner_name['firstName'],
//                                 'Last Name': owner_name['lastName'],
//                                 'Middle Name': owner_name['middleName'],
//                                 'Name Suffix': owner_name['suffix'],
//                                 'Mailing Care of Name': '',
//                                 'Mailing Address': result['Mailing Address'],
//                                 'Mailing Unit #': '',
//                                 'Mailing City': result['Mailing City'],
//                                 'Mailing State': result['Mailing State'],
//                                 'Mailing Zip': result['Mailing Zip'],
//                                 'Property Address': property_address,
//                                 'Property Unit #': '',
//                                 'Property City': '',
//                                 'Property State': 'TX',
//                                 'Property Zip': '',
//                                 'County': 'Midland',
//                                 'Owner Occupied': result['Owner Occupied'],
//                                 'Property Type': result['Property Type'],
//                                 'Total Assessed Value': result['Total Assessed Value'],
//                                 'Last Sale Recording Date': result['Last Sale Recoding Date'],
//                                 'Last Sale Amount': result['Last Sale Amount'],
//                                 'Est. Remaining balance of Open Loans': '',
//                                 'Est Value': result['Est. Value'],
//                                 'Effective Year Built': '',
//                                 'Est Equity': '',
//                                 'Lien Amount': ''
//                             };

//                             console.log(dataFromPropertyAppraisers);
//                             await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
//                         }/* else {
//                             let newDocument = await this.cloneDocument(docToSave)
//                             newDocument['Full Name'] = owner_name['fullName'];
//                             newDocument['First Name'] = owner_name['firstName'];
//                             newDocument['Last Name'] = owner_name['lastName'];
//                             newDocument['Middle Name'] = owner_name['middleName'];
//                             newDocument['Name Suffix'] = owner_name['suffix'];
//                             newDocument['Owner Occupied'] = result['Owner Occupied'];
//                             newDocument['Mailing Care of Name'] = '';
//                             newDocument['Mailing Address'] = result['Mailing Address'];
//                             newDocument['Mailing City'] = result['Mailing City'];
//                             newDocument['Mailing State'] = result['Mailing State'];
//                             newDocument['Mailing Zip'] = result['Mailing Zip'];
//                             newDocument['Mailing Unit #'] = '';
//                             newDocument['Property Type'] = result['Property Type'];
//                             newDocument['Total Assessed Value'] = result['Total Assessed Value'];
//                             newDocument['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                             newDocument['Last Sale Amount'] = result['Last Sale Amount'];
//                             newDocument['Est. Remaining balance of Open Loans'] = '';
//                             newDocument['Est Value'] = result['Est. Value'];
//                             newDocument['Effective Year Built'] = '';
//                             newDocument['Est Equity'] = '';
//                             await this.saveToLineItem(newDocument);
//                             await this.saveToOwnerProductProperty(newDocument);
//                         }*/
//                     }       
//                 }
//             } catch (e) {
//                 console.log('Address not found', e)
//             }
//         }
//         return true;
//     }
// }