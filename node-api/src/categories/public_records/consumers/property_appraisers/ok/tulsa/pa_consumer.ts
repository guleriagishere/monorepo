// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import {IPublicRecordAttributes} from '../../../../../../models/public_record_attributes';
// import puppeteer from "puppeteer";
// const nameParsingService = require('../../consumer_dependencies/nameParsingService');
// const addressService = require('../../consumer_dependencies/addressService')
// const parser = require('parse-address');

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://assessor.tulsacounty.org/assessor-property-search.php',
//     }

//     xpaths = {
//         isPAloaded: '//*[@class="buttons buttonset"]//*[@class="positive"]',
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
//     }

//     async finderIds(page: puppeteer.Page) {
//         try {
//             return await page.evaluate(() => {
//                 let options = Array.from(document.querySelectorAll('#pickone > tbody > tr > td:first-child'));
//                 return options.map(x => x.innerHTML);
//             })
//         } catch (error) {
//             console.log(error)
//             return []
//         }
//     }

//     async parsePage(page: puppeteer.Page, propertyAddress: string) {
//         const rawOwnerName = await this.getOrdinalTableText(page, 'general', 'Owner name');
//         const estimationValue = await this.getOrdinalTableText(page, 'quick', 'Fair cash (market) value');
//         let address = await this.getAddress(page, 'general', 'Owner mailing address');
//         const {state, city, zip} = addressService.parsingDelimitedAddress(address);
//         address = address.replace(/\n/g, ' ')
//         const grossAssessedValue = await this.getOrdinalTableText(page, 'tax', 'Gross assessed value', 3);
//         let propertySaleDate = await this.getSalesTableText(page, 1);
//         propertySaleDate = propertySaleDate.trim() === 'No sale information is available' ? '' : propertySaleDate;
//         let propertySalePrice = await this.getSalesTableText(page, 4);
//         propertySalePrice = /\$—/.test(propertySalePrice) ? '' : propertySalePrice;

//         const processedNamesArray = nameParsingService.parseOwnersFullName(rawOwnerName);
//         const ownerOccupied = addressService.comparisonAddresses(address, propertyAddress);
//         const propertyType = await this.getOrdinalTableText(page, 'general', 'Zoning');

//         return {
//             'owner_names': processedNamesArray,
//             'Unit#': '',
//             'Property City': '',
//             'Property State': 'Oklahoma',
//             'Property Zip': '',
//             'County': 'Tulsa',
//             'Owner Occupied': ownerOccupied,
//             'Mailing Care of Name': '',
//             'Mailing Address': address,
//             'Mailing Unit #': '',
//             'Mailing City': city,
//             'Mailing State': state,
//             'Mailing Zip': zip,
//             'Property Type': propertyType,
//             'Total Assessed Value': grossAssessedValue,
//             'Last Sale Recoding Date': propertySaleDate,
//             'Last Sale Amount': propertySalePrice,
//             'Est. Value': estimationValue,
//             'Effective Year Built': '',
//             'Est. Equity': '',
//         };
//     }

// //Get text from ordinal table from property info page
//     async getOrdinalTableText(page: puppeteer.Page, tableId: string, label: string, childNumber = 1) {
//         const selector = `//*[@id="${tableId}"]//td[contains(text(), "${label}")]/following-sibling::td[${childNumber}]`;
//         const [elm] = await page.$x(selector);
//         if (elm == null) {
//             return '';
//         }
//         let text = await page.evaluate(j => j.innerText, elm);
//         return text.replace(/\n/g, ' ');
//     };

//     async getAddress(page: puppeteer.Page, tableId: string, label: string, childNumber = 1) {
//         const selector = `//*[@id="${tableId}"]//td[contains(text(), "${label}")]/following-sibling::td[${childNumber}]`;
//         const [elm] = await page.$x(selector);
//         if (elm == null) {
//             return '';
//         }
//         return await page.evaluate(j => j.innerText, elm);
//     };

// //Get text from property info sales section
//     async getSalesTableText(page: puppeteer.Page, elementNumber: number) {
//         const selector = `//*[@id="sales"]//tr[1]/td[${elementNumber}]`;
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
//             await this.browserPages.propertyAppraiserPage?.click('.buttonset > .positive');
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
//                 let searchAddress = parser.parseLocation(document["Property Address"]);
//                 searchAddress.street = searchAddress.street.replace(/\b(?:N|S|W|E|East|West|North|South)\b/gi, '');
//                 searchAddress.street.trim()
//                 await page.waitForSelector("#srchaddr");
//                 await page.waitForXPath('//*[@id="srchaddr"]//label[contains(text(), "Property address")]');
//                 const [clickAddressElement] = await page.$x('//*[@id="srchaddr"]//label[contains(text(), "Property address")]');
//                 await clickAddressElement.click();
//                 await page.focus('#streetno');
//                 await page.keyboard.type(searchAddress.number);
//                 searchAddress.prefix && await page.select('#streetno ~ select[name=predirection]', searchAddress.prefix.toUpperCase());
//                 await page.focus('#streetname');
//                 await page.keyboard.type(searchAddress.street.trim());
//                 if (searchAddress.type) {
//                     try {
//                         searchAddress.type = searchAddress.type == 'Rd' ? 'Road' : searchAddress.type
//                         const [optionSuffix] = await page.$x(`//*[@id="streettype"]/option[contains(text(), "${searchAddress.type}")]`);
//                         const valueSuffix: string = <string>await (await optionSuffix.getProperty('value')).jsonValue();
//                         await page.select("#streettype", valueSuffix);
//                     } catch (e) {
//                     }
//                 }
//                 await page.click('#bttnaddr');
//                 await page.waitForSelector('#content');
//                 const elementSingle = await page.$('#quick')
//                 if (!!elementSingle) {
//                     await page.waitForSelector('#quick',);
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
//                     try {
//                         await page.waitForSelector('#pickone_wrapper', {timeout: 7000});
//                         const ids = await this.finderIds(page);
//                        if (ids.length < 4) {
//                            for (let j = 0; j < ids.length; j++) {
//                                await page.goto(`https://www.assessor.tulsacounty.org/assessor-property.php?account=${ids[j]}&go=1`);
//                                await page.waitForSelector('#quick');
//                                const result = await this.parsePage(page, document["Property Address"]);
//                                for (let i = 0; i < result['owner_names'].length; i++) {
//                                    const owner_name = result['owner_names'][i];
//                                    if (i == 0 && j == 0) {
//                                        document['Full Name'] = owner_name['fullName'];
//                                        document['First Name'] = owner_name['firstName'];
//                                        document['Last Name'] = owner_name['lastName'];
//                                        document['Middle Name'] = owner_name['middleName'];
//                                        document['Name Suffix'] = owner_name['suffix'];
//                                        document['Owner Occupied'] = result['Owner Occupied'];
//                                        document['Mailing Care of Name'] = '';
//                                        document['Mailing Address'] = result['Mailing Address'];
//                                        document['Mailing City'] = result['Mailing City'];
//                                        document['Mailing State'] = result['Mailing State'];
//                                        document['Mailing Zip'] = result['Mailing Zip'];
//                                        document['Mailing Unit #'] = '';
//                                        document['Property Type'] = result['Property Type'];
//                                        document['Total Assessed Value'] = result['Total Assessed Value'];
//                                        document['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                        document['Last Sale Amount'] = result['Last Sale Amount'];
//                                        document['Est. Remaining balance of Open Loans'] = '';
//                                        document['Est Value'] = result['Est. Value'];
//                                        document['Effective Year Built'] = '';
//                                        document['Est Equity'] = '';
//                                        document.propertyAppraiserProcessed = true;
//                                        await document.save();
//                                    } else {
//                                        let newDocument = await this.cloneMongoDocument(document)
//                                        newDocument['Full Name'] = owner_name['fullName'];
//                                        newDocument['First Name'] = owner_name['firstName'];
//                                        newDocument['Last Name'] = owner_name['lastName'];
//                                        newDocument['Middle Name'] = owner_name['middleName'];
//                                        newDocument['Name Suffix'] = owner_name['suffix'];
//                                        newDocument['Owner Occupied'] = result['Owner Occupied'];
//                                        newDocument['Mailing Care of Name'] = '';
//                                        newDocument['Mailing Address'] = result['Mailing Address'];
//                                        newDocument['Mailing City'] = result['Mailing City'];
//                                        newDocument['Mailing State'] = result['Mailing State'];
//                                        newDocument['Mailing Zip'] = result['Mailing Zip'];
//                                        newDocument['Mailing Unit #'] = '';
//                                        newDocument['Property Type'] = result['Property Type'];
//                                        newDocument['Total Assessed Value'] = result['Total Assessed Value'];
//                                        newDocument['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
//                                        newDocument['Last Sale Amount'] = result['Last Sale Amount'];
//                                        newDocument['Est. Remaining balance of Open Loans'] = '';
//                                        newDocument['Est Value'] = result['Est. Value'];
//                                        newDocument['Effective Year Built'] = '';
//                                        newDocument['Est Equity'] = '';
//                                        await newDocument.save();
//                                    }
//                                }
//                            }
//                        } else   {
//                            console.log('Many matches found!')
//                        }
//                     } catch (e) {
//                         console.log('Address not found: ', document["Property Address"])
//                     }
//                 }
//             } catch (e) {
//                 console.log('Address not found: ', document["Property Address"])
//             }
//             await page.waitForSelector('button.positive[name=accepted]');
//             await page.click('button.positive[name=accepted]');
//         }
//         return true;
//     }
// }