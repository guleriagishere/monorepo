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
//         propertyAppraiserPage: 'https://gastonnc.devnetwedge.com/'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="navbar"]'
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





//             //main try 
//             try {
//                 address = parseAddress.parseLocation(address);

//                 //go to the search page
//                 try {
//                     await page.goto('https://gastonnc.devnetwedge.com/', {
//                         waitUntil: 'networkidle0',
//                         timeout: 60000
//                     });
//                 } catch (error) {
//                     console.log("error  : " + error);
//                     console.log('couldnt head to gastonnc.devnetwedge.com retrying ... ');
//                     //retry for second time
//                     try {

//                         await page.goto('https://gastonnc.devnetwedge.com/', {
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
//                         await page.waitForXPath(`//*[@id="street-name"]`);
//                         let [searchBox] = await page.$x(`//*[@id="street-name"]`);
//                         await searchBox.click({ clickCount: 3 });
//                         await searchBox.press('Backspace');
//                         await searchBox.type(address.street);
//                     }
//                 } catch (error) {
//                     console.log('Error in fill in the street name :');
//                     console.log(error);
//                 }






//                 // fill in the house number
//                 try {
//                     if (address.number) {
//                         //fill in the house number (low)
//                         await page.waitForXPath(`//*[@id="house-number-min"]`);
//                         let [houseNumberInputMin] = await page.$x(`//*[@id="house-number-min"]`);
//                         await houseNumberInputMin.click({ clickCount: 3 });
//                         await houseNumberInputMin.press('Backspace');
//                         await houseNumberInputMin.type(address.number);

//                         //fill in the house number (high)
//                         await page.waitForXPath(`//*[@id="house-number-max"]`);
//                         let [houseNumberInputMax] = await page.$x(`//*[@id="house-number-max"]`);
//                         await houseNumberInputMax.click({ clickCount: 3 });
//                         await houseNumberInputMax.press('Backspace');
//                         await houseNumberInputMax.type(address.number);
//                     }

//                 } catch (error) {
//                     console.log('Error in fill in the house number  :');
//                     console.log(error);
//                 }









//                 //click search 
//                 try {
//                     await page.waitForXPath(`//button[text()='Search']`);
//                     let [searchButton] = await page.$x(`//button[text()='Search']`);
//                     await searchButton.click();


//                 } catch (error) {
//                     console.log('Error in click search :');
//                     console.log(error);
//                 }






//                 try {
//                     await page.waitForNavigation({
//                         waitUntil: 'networkidle0',
//                     });
//                 } catch (error) {
//                     console.log('Error in loading :');
//                     console.log(error);
//                 }





//                 let [notFoundIndicator] = await page.$x(`//*[contains(text(),'No data available in table')]`);
//                 let [foundMoreThanResultIndicator] = await page.$x(`//*[contains(text(),'Search Results')]`);
//                 if (notFoundIndicator) {
//                     console.log("address Not Found ! ");
//                 } else if (foundMoreThanResultIndicator) {
//                     console.log("Found more than one result ! ");
//                 } else {






//                     let secondaryOwnersNamesArray = [];

//                     //owners' names
//                     try {
//                         let ownersNames: any = await page.$x(`//*[text()='OWNER']/following-sibling::*`)

//                         //loop trough owners names 
//                         for (let index = 0; index < ownersNames.length; index++) {
//                             //get one owner name text from the array of elements handlers
//                             let ownerName;
//                             ownerName = ownersNames[index];
//                             ownerName = await ownerName.getProperty('textContent');
//                             ownerName = await ownerName.jsonValue();

//                             //the first owner name will be stored in the main document
//                             if (index == 0) {
//                                 //separate the name if its type is a person
//                                 let discriminateResult = discriminateAndRemove(ownerName);
//                                 if (discriminateResult.type == 'person') {
//                                     let separatedNamesArray = checkForMultipleNamesAndNormalize(discriminateResult.name);

//                                     for (let i = 0; i < separatedNamesArray.length; i++) {
//                                         let separatedNameObj = separatedNamesArray[i];
//                                         if (i == 0) {
//                                             document["Full Name"] = separatedNameObj.fullName;
//                                             document["First Name"] = separatedNameObj.firstName;
//                                             document["Last Name"] = separatedNameObj.lastName;
//                                             document["Middle Name"] = separatedNameObj.middleName;
//                                             document["Name Suffix"] = separatedNameObj.nameSuffix;
//                                         }
//                                         else {
//                                             secondaryOwnersNamesArray.push(separatedNameObj);
//                                         }
//                                     }

//                                 } else {
//                                     document["Full Name"] = discriminateResult.name;
//                                 }
//                             }
//                             //the other owner names will be kept in an array to clone to object using it
//                             else {
//                                 secondaryOwnersNamesArray.push(ownerName);
//                             }
//                         }




//                     } catch (error) {
//                         console.log('Error in owner name');
//                         console.log(error);
//                     }





//                     let secondaryMailingAddressesArray: any = [];

//                     //Mailing Addresses
//                     try {
//                         let mailingAddresses: any = await page.$x(`//*[text()='Mailing Address']/following-sibling::*`)
//                         let mailingAddress;
//                         for (let index = 0; index < mailingAddresses.length; index++) {
//                             mailingAddress = await mailingAddresses[index].getProperty('innerText');
//                             mailingAddress = await mailingAddress.jsonValue();


//                             if (index == 0) {
//                                 if (mailingAddress && mailingAddress.trim() != '') {
//                                     document["Mailing Address"] = mailingAddress.replace(/(\r\n|\n|\r)/gm, " ")
//                                     //add mailing city, state and zip
//                                     let mailingAddress_separated = parseAddress.parseLocation(mailingAddress);
//                                     if (mailingAddress_separated.city) {
//                                         document["Mailing City"] = mailingAddress_separated.city;
//                                     }
//                                     if (mailingAddress_separated.state) {
//                                         document["Mailing State"] = mailingAddress_separated.state;
//                                     }
//                                     if (mailingAddress_separated.zip) {
//                                         document["Mailing Zip"] = mailingAddress_separated.zip;
//                                     }
//                                 }


//                             }

//                             else {
//                                 if (mailingAddress && mailingAddress.trim() != '')
//                                     secondaryMailingAddressesArray.push(mailingAddress);
//                             }

//                         }


//                     } catch (error) {
//                         console.log('Error in Mailing Addresses  :');
//                         console.log(error);
//                     }









//                     //property type
//                     try {
//                         let [propertyType]: any = await page.$x(`//*[text()='Class']/following-sibling::*`);
//                         if (propertyType) {
//                             propertyType = await propertyType.getProperty('innerText');
//                             propertyType = await propertyType.jsonValue();
//                             // console.log('property type : ');
//                             // console.log(propertyType);
//                             // console.log('\n')
//                             if (propertyType && propertyType.trim() != '')
//                                 document["Property Type"] = propertyType;

//                         } else {
//                             console.log('property type Not Available');
//                             console.log('\n')
//                         }
//                     } catch (error) {
//                         console.log('Error in property type :');
//                         console.log(error);
//                     }









//                     //totalAssessedValue text
//                     try {
//                         let [totalAssessedValue]: any = await page.$x(`//*[text()='Assessed Value']/following-sibling::*`);
//                         if (totalAssessedValue) {
//                             totalAssessedValue = await totalAssessedValue.getProperty('innerText');
//                             totalAssessedValue = await totalAssessedValue.jsonValue();
//                             // console.log('total Assessed Value : ');
//                             // console.log(totalAssessedValue);
//                             // console.log('\n')
//                             if (totalAssessedValue && totalAssessedValue.trim() != '')
//                                 document["Total Assessed Value"] = totalAssessedValue;
//                         } else {
//                             console.log('total Assessed Value Not Available');
//                         }

//                     } catch (error) {
//                         console.log('Error in totalAssessedValue :');
//                         console.log(error);
//                     }



//                     //get position of lastSaleDate in the table
//                     let positionOflastSaleDate: any = await page.$x(`//th[text()='Sale Date']/preceding-sibling::*`);
//                     positionOflastSaleDate = positionOflastSaleDate.length;



//                     //lastSaleDate  handler
//                     try {
//                         let lastSaleDate: any = await page.$x(`//th[text()='Sale Date']/parent::tr/parent::thead/following-sibling::tbody/tr/td`);
//                         lastSaleDate = lastSaleDate[positionOflastSaleDate];
//                         //lastSaleDate text
//                         if (lastSaleDate) {
//                             lastSaleDate = await lastSaleDate.getProperty('innerText');
//                             lastSaleDate = await lastSaleDate.jsonValue();
//                             // console.log('Last Sale Date : ');
//                             // console.log(lastSaleDate);
//                             // console.log('\n')
//                             if (lastSaleDate && lastSaleDate.trim() != '')
//                                 document["Last Sale Recording Date"] = lastSaleDate;
//                         } else {
//                             console.log('Last Sale Date Not Available');
//                         }
//                     } catch (error) {
//                         console.log('Error in last Sale Date :');
//                         console.log(error);
//                     }




//                     //get position of lastSalePrice in the table
//                     let positionOflastSalePrice: any = await page.$x(`//th[text()='Price']/preceding-sibling::*`);
//                     positionOflastSalePrice = positionOflastSalePrice.length;






//                     //lastSalePrice  handler
//                     let lastSalePrice: any;
//                     try {
//                         lastSalePrice = await page.$x(`//th[text()='Price']/parent::tr/parent::thead/following-sibling::tbody/tr/td`);
//                         lastSalePrice = lastSalePrice[positionOflastSalePrice];
//                         //lastSalePrice text
//                         if (lastSalePrice) {
//                             lastSalePrice = await lastSalePrice.getProperty('innerText');
//                             lastSalePrice = await lastSalePrice.jsonValue();
//                             // console.log('Last Sale Price  : ');
//                             // console.log(lastSalePrice);
//                             // console.log('\n')
//                             if (lastSalePrice && lastSalePrice.trim() != '')
//                                 document["Last Sale Amount"] = lastSalePrice;
//                         } else {
//                             console.log('Last Sale Price Not Available');
//                         }

//                     } catch (error) {
//                         console.log('Error in last Sale Price :');
//                         console.log(error);
//                     }




//                     //get position of estimated value in the table
//                     let positionOfEstimatedValue: any = await page.$x(`//th[text()='Market Total']/preceding-sibling::*`);
//                     positionOfEstimatedValue = positionOfEstimatedValue.length;



//                     // estimatedValue
//                     let estimatedValue: any;
//                     try {
//                         //estimatedValue handler
//                         estimatedValue = await page.$x(`//th[text()='Market Total']/parent::tr/parent::thead/following-sibling::tbody/tr/td`);
//                         estimatedValue = estimatedValue[positionOfEstimatedValue];
//                         //estimatedValue text
//                         if (estimatedValue) {
//                             estimatedValue = await estimatedValue.getProperty('innerText');
//                             estimatedValue = await estimatedValue.jsonValue();
//                             // console.log('estimated value  : ');
//                             // console.log(estimatedValue);
//                             // console.log('\n')
//                             if (estimatedValue && estimatedValue.trim() != '')
//                                 document["Est Value"] = estimatedValue;
//                         } else {
//                             console.log('estimated value  Not Available');
//                         }

//                     } catch (error) {
//                         console.log('Error in estimated Value :');
//                         console.log(error);
//                     }





//                     //get position of appraised value in the table
//                     let positionOfAppraisedValue: any = await page.$x(`//th[text()='Appraised Value']/preceding-sibling::*`);
//                     positionOfAppraisedValue = positionOfAppraisedValue.length;













//                     //owner occupied
//                     try {
//                         let ownerOccupied;
//                         if (document["Mailing Address"] != "" && document["Property Address"]) {
//                             //normalize addresses then compare
//                             if (
//                                 document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase()) ||
//                                 document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() == document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() ||
//                                 document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase())
//                             ) {
//                                 ownerOccupied = true;
//                             } else {
//                                 ownerOccupied = false;
//                             }
//                             document["Owner Occupied"] = ownerOccupied;
//                         }

//                     } catch (error) {
//                         console.log("Owner Occupied ERROR : ")
//                         console.log(error);
//                     }


//                     //document parsed 
//                     document.propertyAppraiserProcessed = true;



//                     //save 
//                     console.log(await document.save());


//                     try {
//                         let index = 0;
//                         //all secondaryOwnersNamesArray are persons no need to test them 
//                         secondaryOwnersNamesArray.forEach(async ownerNameSeparated => {
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

//                             if (typeof secondaryMailingAddressesArray[index] !== 'undefined') {

//                                 let mailingAddress = secondaryMailingAddressesArray[index];
//                                 if (mailingAddress && mailingAddress.trim() != '') {
//                                     newDoc["Mailing Address"] = mailingAddress.replace(/(\r\n|\n|\r)/gm, " ")
//                                     //add mailing city, state and zip
//                                     let mailingAddress_separated = parseAddress.parseLocation(mailingAddress);
//                                     if (mailingAddress_separated.city) {
//                                         newDoc["Mailing City"] = mailingAddress_separated.city;
//                                     }
//                                     if (mailingAddress_separated.state) {
//                                         newDoc["Mailing State"] = mailingAddress_separated.state;
//                                     }
//                                     if (mailingAddress_separated.zip) {
//                                         newDoc["Mailing Zip"] = mailingAddress_separated.zip;
//                                     }
//                                 }
//                             }
//                             console.log(await newDoc.save());
//                             index++;
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