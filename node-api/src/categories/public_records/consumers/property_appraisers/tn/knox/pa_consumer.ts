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
//         propertyAppraiserPage: 'http://tn-knox-assessor.publicaccessnow.com/PropertyLookup.aspx'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="Body"]'
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


//             //head to the PA website
//             try {
//                 await page.goto('http://tn-knox-assessor.publicaccessnow.com/PropertyLookup.aspx', {
//                     waitUntil: 'networkidle0',
//                     timeout: 60000
//                 });
//             } catch (error) {
//                 console.log("error  : " + error);
//                 console.log('couldnt head to jeffersonpva.ky.gov retrying ... ');
//                 //retry for second time
//                 try {

//                     await page.goto('http://tn-knox-assessor.publicaccessnow.com/PropertyLookup.aspx', {
//                         waitUntil: 'networkidle0',
//                         timeout: 60000
//                     });
//                 } catch (error) {
//                     console.log("error  : " + error);
//                     await this.browser?.close();
//                     return false;
//                 }

//             }





//             //affect the current address
//             let address = document["Property Address"];
//             console.log('------------------Looking for address : ' + address + "--------------------")





//             //main try 
//             try {



//                 //fill in the address
//                 try {
//                     await page.waitForXPath(`//*[@id="fldSearchFor"]`);
//                     let [searchBox] = await page.$x(`//*[@id="fldSearchFor"]`);
//                     await searchBox.click({ clickCount: 3 });
//                     await searchBox.press('Backspace');
//                     await searchBox.type(address);

//                 } catch (error) {
//                     console.log('Error happened while filling in the address:');
//                     console.log(error);
//                     continue;

//                 }


//                 //click search 
//                 try {
//                     await page.waitForXPath(`//*[@id="QuickSearch"]/div/div/table/tbody/tr/td[2]/button[1]/span`);
//                     let [searchButton] = await page.$x(`//*[@id="QuickSearch"]/div/div/table/tbody/tr/td[2]/button[1]/span`);
//                     await searchButton.click();

//                 } catch (error) {
//                     console.log('Error in click search :');
//                     console.log(error);
//                     continue;

//                 }



//                 //wait for results to load
//                 try {
//                     await page.waitForNavigation();
//                 } catch (error) {
//                     console.log('Error in loading the results :');
//                     console.log(error);
//                     continue;

//                 }






//                 let [notFoundIndicator] = await page.$x(`//*[@id="QuickSearch"]/*[contains(text(),"Sorry, no records were found")]`);
//                 if (notFoundIndicator) {
//                     console.log('address not found');
//                     continue;
//                 }


//                 //click in the search result
//                 try {
//                     await page.waitForXPath('//*[@id="QuickSearch"]/div[2]/div[1]/ul[2]/li[1]/a');
//                     let [searchResult] = await page.$x(`//*[@id="QuickSearch"]/div[2]/div[1]/ul[2]/li[1]/a`);
//                     await searchResult.click();

//                 } catch (error) {
//                     console.log(error);
//                     continue;
//                 }




//                 try {
//                     // wait for results to load
//                     await page.waitForNavigation();
//                 } catch (error) {
//                     console.log('Error in  :');
//                     console.log(error);
//                 }







//                 //owner name
//                 let secondaryOwnersNamesArray = [];
//                 let generalInfo: any;
//                 try {
//                     [generalInfo] = await page.$x(`//*[@id="lxT459"]/table/tbody/tr[1]/td`);
//                     generalInfo = await generalInfo.getProperty('textContent')
//                     generalInfo = await generalInfo.jsonValue();
//                     //devide by lines
//                     generalInfo = generalInfo?.split(/\r?\n/);
//                     //remove empty strings


//                     generalInfo = generalInfo.filter(function (el:any) {
//                         return el.trim() != "";
//                     });


//                     //owner name
//                     let ownerName = generalInfo[0].trim();
//                     let discriminateResult = discriminateAndRemove(ownerName);
//                     if (discriminateResult.type == 'person') {
//                         let separatedNamesArray = checkForMultipleNamesAndNormalize(discriminateResult.name);

//                         for (let i = 0; i < separatedNamesArray.length; i++) {
//                             let separatedNameObj = separatedNamesArray[i];
//                             if (i == 0) {
//                                 document["Full Name"] = separatedNameObj.fullName;
//                                 document["First Name"] = separatedNameObj.firstName;
//                                 document["Last Name"] = separatedNameObj.lastName;
//                                 document["Middle Name"] = separatedNameObj.middleName;
//                                 document["Name Suffix"] = separatedNameObj.nameSuffix;
//                             }
//                             else {
//                                 secondaryOwnersNamesArray.push(separatedNamesArray[i]);
//                             }

//                         }
//                     } else {
//                         document["Full Name"] = discriminateResult.name;
//                     }
//                 } catch (error) {
//                     console.log('Error in owner name :');
//                     console.log(error);
//                 }






//                 //mailling address
//                 try {
//                     let maillingAddress1 = generalInfo[1].replace(/  +/g, ' ');
//                     let maillingAddress2 = generalInfo[2].replace(/  +/g, ' ');
//                     console.log('Mailling address 1: ' + maillingAddress1);
//                     console.log('Mailling address 2 : ' + maillingAddress2);

//                     maillingAddress1 = maillingAddress1.trim();
//                     maillingAddress2 = maillingAddress2.trim();
//                     document["Mailing Address"] = maillingAddress1 + " " + maillingAddress2;


//                     //add mailing city, state and zip
//                     let maillingAddress_separated = parseAddress.parseLocation(maillingAddress1 + " " + maillingAddress2);
//                     if (maillingAddress_separated.city) {
//                         document["Mailing City"] = maillingAddress_separated.city;
//                     }
//                     if (maillingAddress_separated.state) {
//                         document["Mailing State"] = maillingAddress_separated.state;
//                     }
//                     if (maillingAddress_separated.zip) {
//                         document["Mailing Zip"] = maillingAddress_separated.zip;
//                     }

//                 } catch (error) {
//                     console.log('Error in mailling address :');
//                     console.log(error);
//                 }




//                 // //property address 
//                 // try {
//                 //     let [propertyAddress]:any = await page.$x(`//*[@id="lxT459"]/table/tbody/tr[4]/td`);
//                 //     propertyAddress = await propertyAddress.getProperty('textContent')
//                 //     propertyAddress = await propertyAddress.jsonValue();
//                 //     console.log('property address  : ' + propertyAddress);

//                 // } catch (error) {
//                 //     console.log('Error in property address :');
//                 //     console.log(error);
//                 // }





//                 //get property type 
//                 try {
//                     let [propertyType]: any = await page.$x(`//*[@id="lxT459"]/table/tbody/*/*[contains(text(),"Property Class")]/following-sibling::td`);
//                     propertyType = await propertyType.getProperty('textContent')
//                     propertyType = await propertyType.jsonValue();
//                     console.log("property type : " + propertyType)
//                     propertyType = propertyType.trim();
//                     document["Property Type"] = propertyType;
//                 } catch (error) {
//                     console.log('Error in property type :');
//                     console.log(error);
//                 }


//                 //get Total assessed value 
//                 try {
//                     let [totalAssessedValue]: any = await page.$x(`//*[@id="ValueHistory"]/tbody/*/*[contains(text(),"Total Appr")]/following-sibling::td`);
//                     totalAssessedValue = await totalAssessedValue.getProperty('innerText')
//                     totalAssessedValue = await totalAssessedValue.jsonValue();
//                     totalAssessedValue = totalAssessedValue.trim();
//                     console.log("Total assessed value : " + totalAssessedValue)
//                     document["Total Assessed Value"] = totalAssessedValue;
//                 } catch (error) {
//                     console.log('Error in Total assessed value :');
//                     console.log(error);
//                 }







//                 //check if sales history available
//                 let [salesHistoryNotFound] = await page.$x(`//*[@id="lxT461"]/*[contains(text(),"does not exist")]`);
//                 if (salesHistoryNotFound) {
//                     console.log('Sales history does not exist for this account')
//                 } else {
//                     //get the  last sale date and price from inside the sales history







//                     //last Sale Date
//                     try {
//                         await page.waitForXPath('//*[@id="lxT461"]/table/tbody/tr[2]/td[3]');
//                         let [lastSaleDate]: any = await page.$x(`//*[@id="lxT461"]/table/tbody/tr[2]/td[3]`);
//                         lastSaleDate = await lastSaleDate.getProperty('innerText')
//                         lastSaleDate = await lastSaleDate.jsonValue();
//                         lastSaleDate = lastSaleDate.trim();
//                         console.log('last sale date : ' + lastSaleDate);
//                         document["Last Sale Recording Date"] = lastSaleDate;

//                     } catch (error) {
//                         console.log('Error in last Sale Date :');
//                         console.log(error);
//                     }







//                     //last sale price
//                     try {
//                         let [lastSalePrice]: any = await page.$x(`//*[@id="lxT461"]/table/tbody/tr[2]/td[9]`);
//                         lastSalePrice = await lastSalePrice.getProperty('innerText')
//                         lastSalePrice = await lastSalePrice.jsonValue();
//                         lastSalePrice = lastSalePrice.trim();
//                         console.log('last sale price : ' + lastSalePrice);
//                         document["Last Sale Amount"] = lastSalePrice;

//                     } catch (error) {
//                         console.log('Error in last sale price :');
//                         console.log(error);
//                     }





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
//                         //all secondaryOwnersNamesArray are persons no need to test them 
//                         secondaryOwnersNamesArray.forEach(async ownerNameSeparated => {

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