// import puppeteer from 'puppeteer';
// const parseAddress = require('parse-address');

// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://www.accesskent.com/Property/'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="head"]'
//     }

//     constructor(state: string, county: string, categories: string[] = ['foreclosure', 'preforeclosure', 'auction', 'tax-lien', 'bankruptcy'], source: string = '') {
//         super();
//         this.source = source;
//         this.state = state;
//         this.county = county;
//         this.categories = categories;
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
//         //-------------------name seperation stuff goes here-------------------//

//         const companyIdentifiersArray = ['GENERAL', 'TRUST', 'TRUSTEE', 'TRUSTEES', 'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY', 'PA', 'P A', '\\d\\d+', 'TR', 'S A', 'FIRM', 'PORTFOLIO', 'LEGAL', 'MANAGEMENT', 'COUNTY', 'CWSAMS', 'LP', 'CITY', 'INDUSTRIAL', 'IND', 'PARK', 'HABITAT', 'HOLDINGS', 'MOUNT', 'MISSIONARY', 'PUBLIC', 'LAND', 'CHURCH\\s*OF'];
//         const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'JTRS', 'TRS', 'C\/O', '\\(BEN\\)', 'EST OF', 'EST', 'LE(?=\\s*$)', 'H\/E', 'ETAL', 'ET AL'];
//         const suffixNamesArray = ['I', 'II', 'III', 'IV', 'V', 'ESQ', 'JR', 'SR']

//         const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
//         const removeFromNameRegexString = `^(.*?)(?:\\b|\\s+)(?:${removeFromNamesArray.join('|')})(?:\\b(.*?))?$`;

//         const discriminateAndRemove = (name: any) => {
//             let isCompanyName = name.match(new RegExp(companyRegexString, 'i'));
//             if (isCompanyName) {
//                 return {
//                     type: 'company',
//                     name: name
//                 }
//             }

//             let cleanName = name.match(new RegExp(removeFromNameRegexString, 'i'))
//             if (cleanName) {
//                 if (cleanName[1].trim()) {
//                     name = cleanName[1];
//                 }
//                 else if (cleanName[2].trim()) {
//                     name = cleanName[2];
//                 }
//             }
//             return {
//                 type: 'person',
//                 name: name
//             }
//         }

//         const normalizeNames = (fullName: any) => {
//             const normalizeNameRegexString = `^\\s*(?:(.*?)\\s*,\\s*)?([^\\s]*)(?:\\s*(.*?))?(?:\\s*((?:${suffixNamesArray.join('|')})))?\\s*$`;
//             const normalizeNameRegex = new RegExp(normalizeNameRegexString, 'i');

//             let normalizedNameMatch = fullName.match(normalizeNameRegex);
//             if (normalizedNameMatch) {
//                 let firstName = normalizedNameMatch[2];
//                 let middleName = normalizedNameMatch[3] || '';
//                 let lastName = normalizedNameMatch[1] || '';
//                 let nameSuffix = normalizedNameMatch[4] || '';
//                 return {
//                     fullName: fullName.trim(),
//                     firstName: firstName.trim(),
//                     middleName: middleName.trim(),
//                     lastName: lastName.trim(),
//                     nameSuffix: nameSuffix.trim()
//                 }
//             }
//             return {
//                 fullName: fullName.trim()
//             }
//         }

//         const checkForMultipleNamesAndNormalize = (name: any) => {
//             let results = [];
//             let lastNameBkup = '';

//             let multipleNames = name.match(/^(.*?)\s*&\s*(.*?)$/);
//             while (multipleNames) {
//                 let secondName = '';
//                 if (multipleNames[1].trim()) {
//                     let normalized = normalizeNames(multipleNames[1])
//                     if (normalized.hasOwnProperty('lastName') && normalized.lastName) {
//                         lastNameBkup = normalized.lastName;
//                     } else if (lastNameBkup) {
//                         normalized['lastName'] = lastNameBkup;
//                     }
//                     results.push(normalized);
//                 }

//                 if (multipleNames[2].trim()) secondName = multipleNames[2];
//                 multipleNames = secondName.match(/^(.*?)\s*&\s*(.*?)$/);
//                 if (!multipleNames && secondName.trim()) {
//                     let normalized = normalizeNames(secondName);
//                     if ((!normalized.hasOwnProperty('lastName') || !normalized.lastName) && lastNameBkup) {
//                         normalized['lastName'] = lastNameBkup;
//                     }
//                     results.push(normalized);
//                 }
//             }

//             if (results.length) {
//                 return results;
//             }
//             return [normalizeNames(name)];
//         }
//         //--------------------------name separation stuff ends here---------------------------------//














//         const page = this.browserPages.propertyAppraiserPage!;


//         for (let document of docsToParse) {










//             //affect the current address
//             let address: any = document["Property Address"];


//             console.log('------------------Looking for address : ' + address + "--------------------")


//             address = parseAddress.parseLocation(address);


//             //main try 
//             try {


//                 //go to the search page
//                 try {
//                     await page.goto('https://www.accesskent.com/Property/', {
//                         waitUntil: 'networkidle0',
//                         timeout: 60000
//                     });
//                 } catch (error) {
//                     console.log("error  : " + error);
//                     console.log('couldnt head to www.accesskent.com retrying ... ');
//                     //retry for second time
//                     try {
//                         await page.goto('https://www.accesskent.com/Property/', {
//                             waitUntil: 'networkidle0',
//                             timeout: 60000
//                         });
//                     } catch (error) {
//                         console.log("error  : " + error);
//                         await this.browser?.close();
//                         return false;
//                     }

//                 }










//                 //fill in the street name
//                 try {
//                     if (address.street) {
//                         await page.waitForXPath(`//*[@id="sreetNameField"]`);
//                         let [searchBox] = await page.$x(`//*[@id="sreetNameField"]`);
//                         await searchBox.click({ clickCount: 3 });
//                         await searchBox.press('Backspace');
//                         if (address.city) {
//                             await searchBox.type(address.street + " " + address.city);
//                         } else {
//                             await searchBox.type(address.street);
//                         }
//                     }

//                 } catch (error) {
//                     console.log('Error in fill in the street name  :');
//                     console.log(error);
//                 }







//                 //fill in the house number
//                 try {
//                     if (address.number) {
//                         await page.waitForXPath(`//*[@id="addressNo"]`);
//                         let [houseNumberInputMin] = await page.$x(`//*[@id="addressNo"]`);
//                         await houseNumberInputMin.click({ clickCount: 3 });
//                         await houseNumberInputMin.press('Backspace');
//                         await houseNumberInputMin.type(address.number);
//                     }

//                 } catch (error) {
//                     console.log('Error in fill in the house number :');
//                     console.log(error);
//                 }







//                 //click search 
//                 try {
//                     await page.waitForXPath(`//*[@id="PropSearch"]/div/div[1]/fieldset/div[3]/div/input`);
//                     let [searchButton] = await page.$x(`//*[@id="PropSearch"]/div/div[1]/fieldset/div[3]/div/input`);
//                     await searchButton.click();

//                 } catch (error) {
//                     console.log('Error in click search :');
//                     console.log(error);
//                 }






//                 try {
//                     await page.waitForNavigation();
//                 } catch (error) {
//                     console.log('Error in loading :');
//                     console.log(error);
//                 }



//                 let [notFoundIndicator] = await page.$x(`//*[contains(text(),'There were no results found.')]`);
//                 // let [foundMoreThanResultIndicator] = await page.$x(`/html/body/div[2]/div/div[1]/div/form/table/tbody/tr/td[3]`);
//                 if (notFoundIndicator) {
//                     console.log("address Not Found ! ");
//                 } else {





//                     //open result 
//                     try {
//                         let [parcelLink] = await page.$x(`/html/body/div[2]/div/div[1]/div/form/table/tbody/tr/td[2]/a`);
//                         if (parcelLink) {
//                             await parcelLink.click();
//                         } else {
//                             console.log('Parcel link is not available');
//                             continue;
//                         }
//                     } catch (error) {
//                         console.log('Error in open result  :');
//                         console.log(error);
//                     }





//                     try {
//                         await page.waitForNavigation();
//                     } catch (error) {
//                         console.log('Error in loading  :');
//                         console.log(error);
//                     }









//                     //owner name 1
//                     let secondaryOwnersNamesArray: any = [];
//                     try {
//                         let [ownerName1]: any = await page.$x(`//*[contains(text(),'Owner Name One:')]/following-sibling::text()`);
//                         if (ownerName1) {
//                             ownerName1 = await page.evaluate(ownerName1 => ownerName1.textContent, ownerName1);
//                             ownerName1 = ownerName1.trim();
//                             // console.log('owner name 1 : ');
//                             // console.log(ownerName1);
//                             // console.log('\n')


//                             //the first owner name will be stored in the main document
//                             //separate the name if its type is a person
//                             let discriminateResult = discriminateAndRemove(ownerName1);
//                             if (discriminateResult.type == 'person') {
//                                 let separatedNamesArray = checkForMultipleNamesAndNormalize(discriminateResult.name);

//                                 for (let i = 0; i < separatedNamesArray.length; i++) {
//                                     let separatedNameObj = separatedNamesArray[i];
//                                     if (i == 0) {
//                                         document["Full Name"] = separatedNameObj.fullName;
//                                         document["First Name"] = separatedNameObj.firstName;
//                                         document["Last Name"] = separatedNameObj.lastName;
//                                         document["Middle Name"] = separatedNameObj.middleName;
//                                         document["Name Suffix"] = separatedNameObj.nameSuffix;
//                                     }
//                                     else {
//                                         secondaryOwnersNamesArray.push(separatedNameObj);
//                                     }
//                                 }

//                             } else {
//                                 document["Full Name"] = discriminateResult.name;
//                             }


//                         } else {
//                             console.log('owner name 1 Not Available');
//                         }
//                     } catch (error) {
//                         console.log('Error in owner name 1 :');
//                         console.log(error);
//                     }






//                     //owner name 2
//                     try {
//                         let [ownerName2]: any = await page.$x(`//*[contains(text(),'Owner Name Two:')]/following-sibling::text()`);
//                         if (ownerName2) {
//                             ownerName2 = await page.evaluate(ownerName2 => ownerName2.textContent, ownerName2);
//                             ownerName2 = ownerName2.trim();
//                             // console.log('owner name 2 : ');
//                             // console.log(ownerName2);
//                             // console.log('\n')

//                             if (ownerName2 != "") {
//                                 let discriminateResult = discriminateAndRemove(ownerName2);
//                                 if (discriminateResult.type == 'person') {
//                                     let separatedNamesArray = checkForMultipleNamesAndNormalize(discriminateResult.name);
//                                     for (let i = 0; i < separatedNamesArray.length; i++) {
//                                         let separatedNameObj = separatedNamesArray[i];
//                                         secondaryOwnersNamesArray.push(separatedNameObj);
//                                     }
//                                 }
//                             }

//                         } else {
//                             console.log('owner name 2 Not Available');
//                         }

//                     } catch (error) {
//                         console.log('Error in owner name 2 :');
//                         console.log(error);
//                     }







//                     //property type
//                     try {
//                         let [propertyType]: any = await page.$x(`//*[contains(text(),'Property Classification:')]/following-sibling::text()`);
//                         if (propertyType) {
//                             propertyType = await page.evaluate(propertyType => propertyType.textContent, propertyType);
//                             propertyType = propertyType.trim();
//                             // console.log('property type : ');
//                             // console.log(propertyType);
//                             // console.log('\n')
//                             if (propertyType != '')
//                                 document["Property Type"] = propertyType;

//                         } else {
//                             console.log('property type Not Available');
//                         }

//                     } catch (error) {
//                         console.log('Error in property type :');
//                         console.log(error);
//                     }






//                     //total Assessed value
//                     try {
//                         //get position of Assessed value in the table
//                         let positionOfTotalAssessedValue: any = await page.$x(`//*[contains(text(),'State Equalized Value')]/preceding-sibling::*`);
//                         positionOfTotalAssessedValue = positionOfTotalAssessedValue.length;

//                         let totalAssessedValue: any = await page.$x(`//*[contains(text(),'State Equalized Value')]/parent::tr/parent::thead/following-sibling::tbody/tr[1]/td`);
//                         totalAssessedValue = totalAssessedValue[positionOfTotalAssessedValue]
//                         if (totalAssessedValue) {
//                             totalAssessedValue = await totalAssessedValue.getProperty('innerText');
//                             totalAssessedValue = await totalAssessedValue.jsonValue();
//                             // console.log('total Assessed Value : ');
//                             // console.log(totalAssessedValue);
//                             // console.log('\n')
//                             if (totalAssessedValue != '')
//                                 document["Total Assessed Value"] = totalAssessedValue;

//                         } else {
//                             console.log('total Assessed Value Not Available');
//                         }
//                     } catch (error) {
//                         console.log('Error in total Assessed Value text:');
//                         console.log(error);
//                     }









//                     //go to the sales history tab 
//                     let [salesHistoryTab] = await page.$x(`//*[contains(text(),'Sales History')]`);
//                     if (salesHistoryTab) {
//                         try {
//                             await salesHistoryTab.click();
//                         } catch (error) {
//                             console.log('Error in go to the sales history tab  :');
//                             console.log(error);
//                         }





//                         //wait for navigation
//                         try {
//                             await page.waitForNavigation();
//                         } catch (error) {
//                             console.log('Error in loading :');
//                             console.log(error);
//                         }








//                         try {


//                             //get position of Last sale date in tha table 
//                             let positionOfLastSaleDate: any = await page.$x(`//*[contains(text(),'Sale Date')]/preceding-sibling::*`);
//                             positionOfLastSaleDate = positionOfLastSaleDate.length;

//                             //total Assessed value
//                             let lastSaleDate: any = await page.$x(`//*[contains(text(),'Sale Date')]/parent::tr/parent::thead/following-sibling::tbody/tr[1]/td`);
//                             lastSaleDate = lastSaleDate[positionOfLastSaleDate]
//                             //Last sale date text
//                             if (lastSaleDate) {
//                                 lastSaleDate = await lastSaleDate.getProperty('innerText');
//                                 lastSaleDate = await lastSaleDate.jsonValue();
//                                 // console.log('Last Sale Date : ');
//                                 // console.log(lastSaleDate);
//                                 // console.log('\n')
//                                 if (lastSaleDate != '')
//                                     document["Last Sale Recording Date"] = lastSaleDate;
//                             } else {
//                                 console.log('Last Sale Date Not Available');
//                             }

//                         } catch (error) {
//                             console.log('Error in Last Sale Date :');
//                             console.log(error);
//                         }

















//                         //last sale price
//                         try {
//                             //get position of last sale price in tha table 
//                             let positionOfLastSalePrice: any = await page.$x(`//*[contains(text(),'Sale Price')]/preceding-sibling::*`);
//                             positionOfLastSalePrice = positionOfLastSalePrice.length;
//                             //total Assessed value
//                             let lastSalePrice: any = await page.$x(`//*[contains(text(),'Sale Price')]/parent::tr/parent::thead/following-sibling::tbody/tr[1]/td`);
//                             lastSalePrice = lastSalePrice[positionOfLastSalePrice];
//                             //last sale price text
//                             if (lastSalePrice) {
//                                 lastSalePrice = await lastSalePrice.getProperty('innerText');
//                                 lastSalePrice = await lastSalePrice.jsonValue();
//                                 // console.log('last sale price : ');
//                                 // console.log(lastSalePrice);
//                                 // console.log('\n')
//                                 if (lastSalePrice && lastSalePrice.trim() != '')
//                                     document["Last Sale Amount"] = lastSalePrice;
//                             } else {
//                                 console.log('last sale price Not Available');
//                             }
//                         } catch (error) {
//                             console.log('Error in  :');
//                             console.log(error);
//                         }



//                     } else {
//                         console.log('Sales history tab not showing ');

//                     }













//                     // //owner occupied
//                     // try {
//                     //     let ownerOccupied;
//                     //     if (document["Mailing Address"] != "" && document["Property Address"]) {
//                     //         //normalize addresses then compare
//                     //         if (
//                     //             document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase()) ||
//                     //             document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() == document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() ||
//                     //             document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase())
//                     //         ) {
//                     //             ownerOccupied = true;
//                     //         } else {
//                     //             ownerOccupied = false;
//                     //         }
//                     //         document["Owner Occupied"] = ownerOccupied;
//                     //     }

//                     // } catch (error) {
//                     //     console.log("Owner Occupied ERROR : ")
//                     //     console.log(error);
//                     // }


//                     //document parsed 
//                     document.propertyAppraiserProcessed = true;



//                     //save 
//                     console.log(await document.save());


//                     try {
//                         //all secondaryOwnersNamesArray are persons no need to test them 
//                         secondaryOwnersNamesArray.forEach(async (ownerNameSeparated: any) => {
//                             if (!ownerNameSeparated.fullName || ownerNameSeparated.fullName == "" || ownerNameSeparated.fullName?.length < 2) {
//                                 return;
//                             }
//                             console.log('---------- cloned doc ----------')
//                             let newDoc = await this.cloneMongoDocument(document);
//                             newDoc["Full Name"] = ownerNameSeparated.fullName;
//                             newDoc["First Name"] = ownerNameSeparated.firstName;
//                             newDoc["Last Name"] = ownerNameSeparated.lastName;
//                             newDoc["Middle Name"] = ownerNameSeparated.middleName;
//                             newDoc["Name Suffix"] = ownerNameSeparated.nameSuffix;
//                             console.log(await newDoc.save());
//                         });
//                     } catch (error) {
//                         console.log('Error in separating other owners names :');
//                         console.log(error);
//                     }




//                 }



//             } catch (error) {
//                 console.log(error);
//                 continue;
//             }




//         }





//         await this.browser?.close();
//         return true;
//     }

// }