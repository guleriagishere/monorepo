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
//         propertyAppraiserPage: 'https://stclairil.devnetwedge.com/'
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





//         const getData = async (page: puppeteer.Page, document: IPublicRecordAttributes) => {


//             let positionOfOwnerName: any;
//             let positionOfMailingAddress: any;
//             try {
//                 //get position of address and owner name in the table
//                 positionOfOwnerName = await page.$x(`//th[text()='Name']/preceding-sibling::*`);
//                 positionOfOwnerName = positionOfOwnerName.length;
    
//                 positionOfMailingAddress = await page.$x(`//th[text()='Address']/preceding-sibling::*`);
//                 positionOfMailingAddress = positionOfMailingAddress.length;
//             } catch (error) {
//                 console.log('Error in => get position of address and owner name in the table :');
//                 console.log(error);
//             }
    
    
//             if (this.searchBy === 'name') {
//                 let propertyAddress: any;
//                 try {
//                     propertyAddress = await page.$x('//*[text()="Site Address"]/following-sibling::div[1]');
//                     propertyAddress = await page.evaluate(el => el.textContent, propertyAddress[0]);
//                     propertyAddress = propertyAddress.replace(/(\r\n|\n|\r|\s+)/gm, " ").trim();
//                     document["Property Address"] = propertyAddress;
//                     let propertyAddress_separated = parseAddress.parseLocation(propertyAddress);
//                     if (propertyAddress_separated.city) {
//                         document["Property City"] = propertyAddress_separated.city;
//                     }
//                     if (propertyAddress_separated.state) {
//                         document["Property State"] = propertyAddress_separated.state;
//                     }
//                     if (propertyAddress_separated.zip) {
//                         document["Property Zip"] = propertyAddress_separated.zip;
//                     }
//                 } catch(error) {
//                     console.log('Error in Property address :');
//                     console.log(error);
//                 }
//             }
    
    
    
//             let mailingAddress: any;
//             try {
//                 //Mailing address handler
//                 mailingAddress = await page.$x(`//th[text()='Address']/parent::tr/parent::thead/following-sibling::*/tr/*`);
//                 mailingAddress = mailingAddress[positionOfMailingAddress];
//             } catch (error) {
//                 console.log('Error in Mailing address handler  :');
//                 console.log(error);
//             }
    
    
    
    
    
    
//             let ownerName: any;
//             try {
//                 //owner name handler
//                 ownerName = await page.$x(`//th[text()='Name']/parent::tr/parent::thead/following-sibling::*/tr/*`);
//                 ownerName = ownerName[positionOfOwnerName]
//             } catch (error) {
//                 console.log('Error in owner name handler :');
//                 console.log(error);
//             }
    
    
    
    
//             let secondaryOwnersNamesArray = [];
    
//             try {
    
//                 //Owner Name text
//                 if (ownerName) {
//                     ownerName = await ownerName.getProperty('innerText');
//                     ownerName = await ownerName.jsonValue();
//                     // console.log('Owner Name : ');
//                     // console.log(ownerName);
//                     // console.log('\n')
    
    
    
    
    
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
    
    
    
//                 } else {
//                     console.log('Owner Name Not Available');
//                 }
    
//             } catch (error) {
//                 console.log('Error in Owner Name text  :');
//                 console.log(error);
//             }
    
    
    
    
    
    
//             try {
//                 //Mailing Address text
//                 let parsedMailingAddress;
//                 if (mailingAddress) {
//                     mailingAddress = await mailingAddress.getProperty('innerText');
//                     mailingAddress = await mailingAddress.jsonValue();
//                     // console.log('Mailing address : ');
//                     // console.log(mailingAddress);
//                     // console.log('\n')
    
    
    
    
    
    
//                     if (mailingAddress && mailingAddress.trim() != '') {
//                         document["Mailing Address"] = mailingAddress.replace(/(\r\n|\n|\r)/gm, " ")
//                         //add mailing city, state and zip
//                         let mailingAddress_separated = parseAddress.parseLocation(mailingAddress);
//                         if (mailingAddress_separated.city) {
//                             document["Mailing City"] = mailingAddress_separated.city;
//                         }
//                         if (mailingAddress_separated.state) {
//                             document["Mailing State"] = mailingAddress_separated.state;
//                         }
//                         if (mailingAddress_separated.zip) {
//                             document["Mailing Zip"] = mailingAddress_separated.zip;
//                         }
//                     }
    
//                 } else {
//                     console.log('Mailing address Not Available');
//                     console.log('\n')
    
//                 }
    
//             } catch (error) {
//                 console.log('Error in Mailing Address text :');
//                 console.log(error);
//             }
    
    
    
    
//             try {
    
//                 //property type
//                 let [propertyType]: any = await page.$x(`//div[text()='Property Class']/following-sibling::div`);
//                 if (propertyType) {
//                     propertyType = await propertyType.getProperty('innerText');
//                     propertyType = await propertyType.jsonValue();
//                     // console.log('property type : ');
//                     // console.log(propertyType);
//                     // console.log('\n')
//                     if (propertyType && propertyType.trim() != '')
//                         document["Property Type"] = propertyType;
    
//                 } else {
//                     console.log('property type Not Available');
//                     console.log('\n')
    
//                 }
    
//             } catch (error) {
//                 console.log('Error in property type :');
//                 console.log(error);
//             }
    
    
    
//             let positionOfTotalAssessedValue: any;
//             let totalAssessedValue: any;
    
    
    
//             try {
//                 //get position of totalAssessedValue in the table
//                 positionOfTotalAssessedValue = await page.$x(`//th[text()='Total']/preceding-sibling::*`);
//                 positionOfTotalAssessedValue = positionOfTotalAssessedValue.length;
//             } catch (error) {
//                 console.log('Error in get position of totalAssessedValue in the table:');
//                 console.log(error);
//             }
    
    
    
    
//             try {
//                 //totalAssessedValue  handler
//                 totalAssessedValue = await page.$x(`//td[text()='Assessor']/following-sibling::*`);
//                 totalAssessedValue = totalAssessedValue[positionOfTotalAssessedValue - 1]
//             } catch (error) {
//                 console.log('Error in totalAssessedValue  handler :');
//                 console.log(error);
//             }
    
    
//             try {
//                 //totalAssessedValue text
//                 if (totalAssessedValue) {
//                     totalAssessedValue = await totalAssessedValue.getProperty('innerText');
//                     totalAssessedValue = await totalAssessedValue.jsonValue();
//                     // console.log('total Assessed Value : ');
//                     // console.log(totalAssessedValue);
//                     // console.log('\n')
//                     if (totalAssessedValue && totalAssessedValue.trim() != '')
//                         document["Total Assessed Value"] = totalAssessedValue;
    
    
//                 } else {
//                     console.log('total Assessed Value Not Available');
//                 }
//             } catch (error) {
//                 console.log('Error in totalAssessedValue text  :');
//                 console.log(error);
//             }
    
    
    
//             let positionOflastSaleDate: any;
//             let lastSaleDate: any;
    
//             try {
//                 //get position of lastSaleDate in the table
//                 positionOflastSaleDate = await page.$x(`//th[text()='Sale Date']/preceding-sibling::*`);
//                 positionOflastSaleDate = positionOflastSaleDate.length;
//             } catch (error) {
//                 console.log('Error in get position of lastSaleDate in the table  :');
//                 console.log(error);
//             }
    
    
    
//             try {
//                 //lastSaleDate  handler
//                 lastSaleDate = await page.$x(`//th[text()='Sale Date']/parent::tr/parent::thead/following-sibling::tbody/tr/td`);
//                 lastSaleDate = lastSaleDate[positionOflastSaleDate];
//             } catch (error) {
//                 console.log('Error in lastSaleDate  handler :');
//                 console.log(error);
//             }
    
    
//             try {
//                 //lastSaleDate text
//                 if (lastSaleDate) {
//                     lastSaleDate = await lastSaleDate.getProperty('innerText');
//                     lastSaleDate = await lastSaleDate.jsonValue();
//                     // console.log('Last Sale Date : ');
//                     // console.log(lastSaleDate);
//                     // console.log('\n')
//                     if (lastSaleDate && lastSaleDate.trim() != '')
//                         document["Last Sale Recording Date"] = lastSaleDate;
    
//                 } else {
//                     console.log('Last Sale Date Not Available');
//                 }
//             } catch (error) {
//                 console.log('Error in lastSaleDate text :');
//                 console.log(error);
//             }
    
    
    
    
    
//             let positionOflastSalePrice: any;
//             let lastSalePrice: any;
    
    
//             try {
//                 //get position of lastSalePrice in the table
//                 positionOflastSalePrice = await page.$x(`//th[text()='Net Price']/preceding-sibling::*`);
//                 positionOflastSalePrice = positionOflastSalePrice.length;
//             } catch (error) {
//                 console.log('Error in get position of lastSalePrice in the table :');
//                 console.log(error);
//             }
    
    
//             try {
//                 //lastSalePrice  handler
//                 lastSalePrice = await page.$x(`//th[text()='Net Price']/parent::tr/parent::thead/following-sibling::tbody/tr/td`);
//                 lastSalePrice = lastSalePrice[positionOflastSalePrice];
//             } catch (error) {
//                 console.log('Error in lastSalePrice  handler  :');
//                 console.log(error);
//             }
    
//             try {
//                 //lastSalePrice text
//                 if (lastSalePrice) {
//                     lastSalePrice = await lastSalePrice.getProperty('innerText');
//                     lastSalePrice = await lastSalePrice.jsonValue();
//                     // console.log('Last Sale Price  : ');
//                     // console.log(lastSalePrice);
//                     // console.log('\n')
//                     if (lastSalePrice && lastSalePrice.trim() != '')
//                         document["Last Sale Amount"] = lastSalePrice;
    
//                 } else {
//                     console.log('Last Sale Price  Not Available');
//                 }
//             } catch (error) {
//                 console.log('Error in lastSalePrice text :');
//                 console.log(error);
//             }
    
    
    
    
    
    
    
    
    
    
    
//             //owner occupied
//             try {
//                 let ownerOccupied;
//                 if (document["Mailing Address"] != "" && document["Property Address"]) {
//                     //normalize addresses then compare
//                     if (
//                         document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase()) ||
//                         document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() == document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase() ||
//                         document["Property Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase().includes(document["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").toLowerCase())
//                     ) {
//                         ownerOccupied = true;
//                     } else {
//                         ownerOccupied = false;
//                     }
//                     document["Owner Occupied"] = ownerOccupied;
//                 }
    
//             } catch (error) {
//                 console.log("Owner Occupied ERROR : ")
//                 console.log(error);
//             }
    
    
//             //document parsed 
//             document.propertyAppraiserProcessed = true;
    
    
    
//             //save 
//             console.log(await document.save());
    
    
//             try {
//                 //all secondaryOwnersNamesArray are persons no need to test them 
//                 secondaryOwnersNamesArray.forEach(async ownerNameSeparated => {
    
//                     console.log('---------- cloned doc ----------')
//                     let newDoc = await this.cloneMongoDocument(document);
//                     newDoc["Full Name"] = ownerNameSeparated.fullName;
//                     newDoc["First Name"] = ownerNameSeparated.firstName;
//                     newDoc["Last Name"] = ownerNameSeparated.lastName;
//                     newDoc["Middle Name"] = ownerNameSeparated.middleName;
//                     newDoc["Name Suffix"] = ownerNameSeparated.nameSuffix;
    
//                     console.log(await newDoc.save());
//                 });
//             } catch (error) {
//                 console.log('Error in separating other owners names :');
//                 console.log(error);
//             }
//         }








//         const page = this.browserPages.propertyAppraiserPage!;


//         for (let document of docsToParse) {
//             this.searchBy = document["Property Address"] ? 'address' : 'name';
//             //affect the current address
//             let address: any = document["Property Address"];
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';

//             if (this.searchBy === 'name') {
//                 const nameInfo = this.getNameInfo(document);
//                 first_name = nameInfo.first_name;
//                 last_name = nameInfo.last_name;
//                 owner_name = nameInfo.owner_name;
//                 owner_name_regexp = nameInfo.owner_name_regexp;
//                 if (owner_name === '') continue;
//                 console.log(`Looking for owner: ${owner_name}`);
//             }
//             else {
//                 console.log(`Looking for address: ${address}`);
//                 address = parseAddress.parseLocation(address);
//             }




//             //main try 
//             try {
//                 //go to the search page
//                 try {
//                     await page.goto('https://stclairil.devnetwedge.com/', {
//                         waitUntil: 'networkidle0',
//                         timeout: 60000
//                     });
//                 } catch (error) {
//                     console.log("error  : " + error);
//                     console.log('couldnt head to stclairil.devnetwedge.com retrying ... ');
//                     //retry for second time
//                     try {

//                         await page.goto('https://stclairil.devnetwedge.com/', {
//                             waitUntil: 'networkidle0',
//                             timeout: 60000
//                         });
//                     } catch (error) {
//                         console.log("error  : " + error);
//                         await this.browser?.close();
//                         return false;
//                     }

//                 }




//                 if (this.searchBy === 'name') {
//                     try {
//                         await page.waitForXPath(`//*[@id="owner-name"]`);
//                         let [searchBox] = await page.$x(`//*[@id="owner-name"]`);
//                         await searchBox.click({ clickCount: 3 });
//                         await searchBox.press('Backspace');
//                         await searchBox.type(owner_name);
//                     } catch (error) {
//                         console.log('Error in owner-name :');
//                         console.log(error);
//                     }
//                 }
//                 else {
//                     try {

//                         if (address.street) {
//                             //fill in the street name
//                             await page.waitForXPath(`//*[@id="street-name"]`);
//                             let [searchBox] = await page.$x(`//*[@id="street-name"]`);
//                             await searchBox.click({ clickCount: 3 });
//                             await searchBox.press('Backspace');
//                             await searchBox.type(address.street);
//                         }
    
//                     } catch (error) {
//                         console.log('Error in address.street :');
//                         console.log(error);
//                     }
    
//                     try {
    
//                         if (address.number) {
//                             //fill in the house number (low)
//                             await page.waitForXPath(`//*[@id="house-number-min"]`);
//                             let [houseNumberInputMin] = await page.$x(`//*[@id="house-number-min"]`);
//                             await houseNumberInputMin.click({ clickCount: 3 });
//                             await houseNumberInputMin.press('Backspace');
//                             await houseNumberInputMin.type(address.number);
    
//                             //fill in the house number (high)
//                             await page.waitForXPath(`//*[@id="house-number-max"]`);
//                             let [houseNumberInputMax] = await page.$x(`//*[@id="house-number-max"]`);
//                             await houseNumberInputMax.click({ clickCount: 3 });
//                             await houseNumberInputMax.press('Backspace');
//                             await houseNumberInputMax.type(address.number);
//                         }
    
//                     } catch (error) {
//                         console.log('Error in address.number :');
//                         console.log(error);
//                     }
//                 }
                



//                 try {

//                     //click search 
//                     await page.waitForXPath(`//button[text()='Search']`);
//                     let [searchButton] = await page.$x(`//button[text()='Search']`);
//                     await searchButton.click();

//                 } catch (error) {
//                     console.log('Error in  :');
//                     console.log(error);
//                 }




//                 try {

//                     await page.waitForNavigation();

//                 } catch (error) {
//                     console.log('Error in  :');
//                     console.log(error);
//                 }





//                 let [notFoundIndicator] = await page.$x(`//*[contains(text(),'Showing 0 to 0 of 0 entries')]`);
//                 let [foundMoreThanResultIndicator] = await page.$x(`//*[contains(text(),'Search Results')]`);
//                 if (notFoundIndicator) {

//                     console.log("address Not Found ! ");

//                 } else if (foundMoreThanResultIndicator) {
//                     await page.waitForXPath('//table[@id="search-results"]/tbody/tr/td[2]');
//                     const rows = await page.$x('//table[@id="search-results"]/tbody/tr');
//                     if (rows.length === 0) {
//                         console.log("No house found");
//                         break;
//                     }

//                     const ids = [];
//                     if (this.searchBy === 'name') {
//                         for (const row of rows) {
//                             console.log(await page.evaluate(el => el.textContent, row));
//                             const {name, id} = await page.evaluate(el => ({name: el.children[2].textContent.trim(), id: el.children[1].textContent}), row);
//                             const regexp = new RegExp(owner_name_regexp);
//                             if (!regexp.exec(name.toUpperCase())) continue;
//                             ids.push(id);
//                         }
//                     }
//                     else {
//                         const id = await page.evaluate(el => el.children[1].textContent, rows[0]);
//                         ids.push(id);
//                     }

//                     if (ids.length === 0) {
//                         console.log("No house found");
//                         break;
//                     }

//                     for (const id of ids) {
//                         const [row] = await page.$x(`//table[@id="search-results"]/tbody/tr[./td[contains(., "${id}")]]`);
//                         if (row) {
//                             await Promise.all([
//                                 row.click(),
//                                 page.waitForNavigation()
//                             ]);
//                             await getData(page, document);
//                             await page.goBack();
//                             await page.waitForXPath('//table[@id="search-results"]/tbody/tr/td[2]');
//                         }
//                     }           
//                 } else {

//                     await getData(page, document);

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