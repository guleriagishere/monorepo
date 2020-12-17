// import puppeteer from 'puppeteer';
// const parseAddress = require('parse-address');

// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// const axios = require("axios");

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://prc-buncombe.spatialest.com/#/'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="main-app"]'
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
//             let address = document["Property Address"];
//             console.log('------------------Looking for address : ' + address + "--------------------")





//             //main try 
//             try {

//                 //go to the search page
//                 try {
//                     await page.goto('https://prc-buncombe.spatialest.com/', {
//                         waitUntil: 'networkidle0',
//                         timeout: 60000
//                     });
//                 } catch (error) {
//                     console.log("error  : " + error);
//                     console.log('couldnt head to prc-buncombe.spatialest.com retrying ... ');
//                     //retry for second time
//                     try {
//                         await page.goto('https://prc-buncombe.spatialest.com/', {
//                             waitUntil: 'networkidle0',
//                             timeout: 60000
//                         });
//                     } catch (error) {
//                         console.log("error  : " + error);
//                         await this.browser?.close();
//                         return false;
//                     }

//                 }






//                 try {
//                     //click I understand 
//                     await page.waitForXPath(`//*[text()='I Understand']`);
//                     let [agreeButton] = await page.$x(`//*[text()='I Understand']`);
//                     await agreeButton.click();
//                 } catch (error) { }






//                 //fill in the address
//                 try {
//                     await page.waitForXPath(`//*[@id="primary_search"]`);
//                     let [searchBox] = await page.$x(`//*[@id="primary_search"]`);
//                     await searchBox.click({ clickCount: 3 });
//                     await searchBox.press('Backspace');
//                     await searchBox.type(address);

//                 } catch (error) {
//                     console.log('Error in fill in the address  :');
//                     console.log(error);
//                 }





//                 try {
//                     //wait for suggestion
//                     await page.waitFor(3000);
//                     //click search 
//                     await page.waitForXPath(`//*[@class='svg-inline--fa fa-search fa-w-16 ']`);
//                     let [searchButton] = await page.$x(`//*[@class='svg-inline--fa fa-search fa-w-16 ']`);
//                     await searchButton.click();
//                 } catch (error) {
//                     console.log('Error in wait for suggestion :');
//                     console.log(error);
//                 }




//                 try {

//                     await page.waitForNavigation();

//                 } catch (error) {
//                     console.log('Error in  Loading :');
//                     console.log(error);
//                 }







//                 let [notFoundIndicator] = await page.$x(`//*[contains(text(),'No record found by that search criteria')]`);
//                 if (notFoundIndicator) {
//                     console.log("address Not Found ! ");
//                 } else {





//                     //parcel number
//                     let parcelNumber;
//                     try {
//                         //to get last element of an array(will be used to get the parcel number)
//                         let last = function (array: any, n: any) {
//                             if (array == null)
//                                 return void 0;
//                             if (n == null)
//                                 return array[array.length - 1];
//                             return array.slice(Math.max(array.length - n, 0));
//                         };
//                         //Parcel number 
//                         parcelNumber = await page.url();
//                         parcelNumber = last(parcelNumber.split('/'), null);
//                         console.log('parcel naumber of the currentt address is :' + parcelNumber)

//                     } catch (error) {
//                         console.log('Error in parcel number :');
//                         console.log(error);
//                     }



//                     let secondaryOwnersNamesArray:any[]=[];

//                     await axios.post(
//                         'https://prc-buncombe.spatialest.com/data/propertycard', {
//                         'parcelid': parcelNumber
//                     }
//                     ).then(async (res: any) => {
//                         if (res.data && res.data.found) {



//                             try {
//                                 res = res.data.parcel;
//                             }
//                             catch (error) {
//                                 console.log('Error in affecting parcel :');
//                                 console.log(error);
//                             }


//                             //Owner
//                             try {
//                                 let headerOfThePage = res.header;
//                                 //sperate owner name
//                                 let discriminateResult = discriminateAndRemove(headerOfThePage.Owners);
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
//                                             secondaryOwnersNamesArray.push(separatedNamesArray[i]);
//                                         }

//                                     }
//                                 } else {
//                                     document["Full Name"] = discriminateResult.name;
//                                 }




//                                 //mailing address
//                                 let fullMailingAddress = "";
//                                 if (headerOfThePage.StreetAddress1) {
//                                     fullMailingAddress = fullMailingAddress + headerOfThePage.StreetAddress1;
//                                     // console.log("Street: " + headerOfThePage.StreetAddress1);

//                                 }


//                                 if (headerOfThePage.City) {
//                                     fullMailingAddress = fullMailingAddress + " " + headerOfThePage.City;
//                                     document["Mailing City"] = headerOfThePage.City;
//                                     // console.log("City: " + headerOfThePage.City)
//                                 }


//                                 if (headerOfThePage.StateProvince) {
//                                     fullMailingAddress = fullMailingAddress + " " + headerOfThePage.StateProvince;
//                                     document["Mailing State"] = headerOfThePage.StateProvince;
//                                     // console.log("State Province: " + headerOfThePage.StateProvince)
//                                 }


//                                 if (headerOfThePage.PostalCode) {
//                                     fullMailingAddress = fullMailingAddress + " " + headerOfThePage.PostalCode;
//                                     document["Mailing Zip"] = headerOfThePage.PostalCode;
//                                     // console.log("Postal Code: " + headerOfThePage.PostalCode)

//                                 }

//                                 document["Mailing Address"] = fullMailingAddress;


//                                 //Estimated Value
//                                 if (headerOfThePage.Total) {
//                                     // console.log(headerOfThePage.Total)
//                                     document["Est Value"] = headerOfThePage.Total;
//                                 }




//                             } catch (error) {
//                                 console.log('Owner Information not available')
//                                 console.log(error)
//                             }




//                             //Land Information
//                             try {
//                                 let landInfo = res.sections[1][0][0].row;


//                                 if (landInfo.TotalAssessedLandValue) {
//                                     document["Total Assessed Value"] = landInfo.TotalAssessedLandValue;
//                                     // console.log("Total Assessed Value: " + landInfo.TotalAssessedLandValue)
//                                 }


//                                 if (landInfo.LandUse) {
//                                     document["Property Type"] = landInfo.LandUse;
//                                     // console.log("Land Use: " + landInfo.LandUse)
//                                 }



//                             } catch (error) {
//                                 console.log('Land Information not available')
//                             }




//                             //building Information
//                             try {
//                                 let buildingInfo = res.sections[2][0][0];
//                                 if (buildingInfo.YearBuilt) {
//                                     document["Effective Year Built"] = buildingInfo.YearBuilt;
//                                 }
//                                 // console.log("Year Built: " + buildingInfo.YearBuilt)

//                             } catch (error) {
//                                 console.log('building Information not available')
//                             }







//                             //sales Information
//                             try {
//                                 let salesInfo = res.sections[3][0][0].row;
//                                 if (salesInfo.saledate) {
//                                     // console.log("sale date: " + salesInfo.saledate)
//                                     document["Last Sale Recording Date"] = salesInfo.saledate;
//                                 }
//                                 if (salesInfo.saleprice) {
//                                     document["Last Sale Amount"] = salesInfo.saleprice;
//                                     // console.log("sale price: " + salesInfo.saleprice)
//                                 }

//                             } catch (error) {
//                                 console.log('sales Information not available')
//                             }




















//                             //owner occupied
//                             try {
//                                 let ownerOccupied;
//                                 if (document["Mailing Address"] != "" && document["Property Address"]) {
//                                     //normalize addresses then compare
//                                     if (
//                                         document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase()) ||
//                                         document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() == document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() ||
//                                         document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase())
//                                     ) {
//                                         ownerOccupied = true;
//                                     } else {
//                                         ownerOccupied = false;
//                                     }
//                                     document["Owner Occupied"] = ownerOccupied;
//                                 }

//                             } catch (error) {
//                                 console.log("Owner Occupied ERROR : ")
//                                 console.log(error);
//                             }


//                             //document parsed 
//                             document.propertyAppraiserProcessed = true;



//                             //save 
//                             console.log(await document.save());


//                             try {
//                                 //all secondaryOwnersNamesArray are persons no need to test them 
//                                 secondaryOwnersNamesArray.forEach(async ownerNameSeparated => {

//                                     console.log('---------- cloned doc ----------')
//                                     let newDoc = await this.cloneMongoDocument(document);
//                                     newDoc["Full Name"] = ownerNameSeparated.fullName;
//                                     newDoc["First Name"] = ownerNameSeparated.firstName;
//                                     newDoc["Last Name"] = ownerNameSeparated.lastName;
//                                     newDoc["Middle Name"] = ownerNameSeparated.middleName;
//                                     newDoc["Name Suffix"] = ownerNameSeparated.nameSuffix;

//                                     console.log(await newDoc.save());
//                                 });
//                             } catch (error) {
//                                 console.log('Error in separating other owners names :');
//                                 console.log(error);
//                             }


//                         }
//                     }).catch((error: any) => {
//                         console.log(error)
//                     });













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