// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// import { String } from 'aws-sdk/clients/cloudsearchdomain';
// var parser = require('parse-address'); 

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://paytax.erie.gov/webprop/index.asp'
//     }

//     xpaths = {
//         isPAloaded: '//p[contains(.,"Property Address")]/input[1]'
//     }
    
//     discriminateAndRemove = (name : string) => {
//         const companyIdentifiersArray = [ 'GENERAL', 'TRUSTEE', 'TRUSTEES', 'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'OF' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENTS', 'HOLDINGS', 'ESTATE', 'LLP', 'LP', 'TRUST', 'LOAN', 'CONDOMINIUM', 'CHURCH', 'CITY', 'CATHOLIC', 'D/B/A', 'COCA COLA', 'LTD', 'CLINIC', 'TODAY', 'PAY', 'CLEANING', 'COSMETIC', 'CLEANERS', 'FURNITURE', 'DECOR', 'FRIDAY HOMES', 'SAVINGS', 'PROPERTY', 'PROTECTION', 'ASSET', 'SERVICES', 'L L C', 'NATIONAL', 'ASSOCIATION', 'MANAGEMENT', 'PARAGON', 'MORTGAGE', 'CHOICE', 'PROPERTIES', 'J T C', 'RESIDENTIAL', 'OPPORTUNITIES', 'FUND', 'LEGACY', 'SERIES', 'HOMES', 'LOAN'];
//         const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS' ,'JTWROS', 'TEN IN COM' , ' - *Joint Tenants', ' - *Tenancy', 'LLC' ,' - *Tenants' , ' - *Heir' ];
//         const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
//         const removeFromNameRegexString = `^(.*?)\\b(?:${removeFromNamesArray.join('|')})\\b.*?$`;
//         const companyRegex = new RegExp(companyRegexString, 'i');
        
//         const removeFromNamesRegex = new RegExp(removeFromNameRegexString, 'i');
//         let isCompanyName = name.match(companyRegex);
//         if (isCompanyName) {
//             return {
//                 type: 'company',
//                 name: name
//             }
//         }
        
//         let cleanName = name.match(removeFromNamesRegex);
//         if (cleanName) {
//             name = cleanName[1];
            
//         }
//         return {
//             type: 'person',
//             name: name
//         }
    
//     }

//     parseSearchAddress = (address : string) =>{
//         const addressSuffixArray = ['APT', 'AVE', 'BLVD', 'BLDG', 'CTR', 'CIR', 'CT', 'DR', 'EXPY', 'EXT', 'FT', 'FWY', 'FL', 'HTS', 'HWY', 'IS', 'JCT', 'LN', 'MT', 'PKY', 'PL', 'PO', 'RD', 'RR', 'ST', 'SPG', 'SPGS', 'SQ', 'STE', 'UNIT', 'RM', 'DEPT', '#' , 'TER', 'TPKE' ,'TRL' ,'CV', 'Pkwy' , 'WAY'];
//         const addressDirArray = ['N', 'S', 'W', 'E', 'NE', 'NW', 'SE', 'SW'];
//         const addressSuffixRegexString = `\\b(?:${addressSuffixArray.join('\\b.*|')})\\b.*`;
//         const adddressDirRegexString = `\\b(?:${addressDirArray.join('|')})\\b`;
//         const addressSuffixRegex = new RegExp(addressSuffixRegexString , 'i');
//         const addressDirRegex = new RegExp(adddressDirRegexString , 'i');

//         address = address.replace(addressDirRegex , '')
//         address = address.replace(addressSuffixRegex , '')
//         const regexAddress = new RegExp(`(?<houseNo>\\d+)?\\b\\s*?(?<street>.*)\\s*`,'gi');
//         const match = regexAddress.exec(address);
//         if(match == null) return {houseNo : null , street : null};
    
//         return match.groups;
//     }
    
//     parseProperty = (property : string) : any => {
//         const regexProperty = new RegExp(`\\b\\d+\\s(?<property>.+)`,'gi');
//         const match = regexProperty.exec(property);
//         if (match == null) return null;
//         return match.groups?.property;
//     }
    
//     parseAddress = (address : string) : any => {
//         const regexAddress = new RegExp(`(?<city>.*)\\s+(?<state>\\w{2})\\b`,'gi');
//         const match = regexAddress.exec(address);
//         if (match == null) return {city : null , state : null , zip : null}
//         return match.groups;
//     }

//     parseName = (name : string) : any =>{
//         const suffixArray = ['II', 'III', 'IV', 'CPA', 'DDS', 'ESQ', 'JD', 'JR', 'LLD', 'MD', 'PHD', 'RET', 'RN', 'SR', 'DO'];
//         const suffixRegexString = `\\b(?:${suffixArray.join('|')})\\b`;
//         const middleNameRegexString = `\\b(?:\\w{1})\\b`;
//         const suffixRegex = new RegExp(suffixRegexString , 'i');
//         const middleNameRegex = new RegExp(middleNameRegexString , 'i');

//         let parsedName = this.discriminateAndRemove(name.trim());
//         let nameArray : any = [null , null];

//         let result : any = {
//             fName : null,
//             lName : null,
//             mName : null,
//             suffix : null,
//             name : name
//         }
//         if(parsedName.type == 'person')
//         {
//             let personName = parsedName['name'];
//             result['name'] = parsedName['name'];
//             personName = personName.replace(',','');
//             const isSuffix = personName.match(suffixRegex);
//             if(isSuffix)
//             {
//                 result.suffix = isSuffix[0];
//                 personName = personName.replace(isSuffix[0] , '');
//             }
//             const isMiddleName : any = personName.match(middleNameRegex);
//             if(isMiddleName)
//             {
//                 result.mName = isMiddleName[0];
//                 personName = personName.replace(new RegExp(`\\b${isMiddleName[0]}\\b`,'gi') , '');
//             }
//             personName = personName.trim();
//             if(isMiddleName != '')
//                 nameArray = personName.split(/\b\s+/g);
//             if(nameArray.length == 3)
//                 result.mName = nameArray[2];
//             result.fName = nameArray[1];
//             result.lName = nameArray[0];
//         }
//         return result;
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

//         const page = this.browserPages.propertyAppraiserPage!;
//         await page.setDefaultNavigationTimeout(0);

//         for (let doc of docsToParse) {
            
//             // do everything that needs to be done for each document here
//             let addressString = doc["Property Address"];
//             await page.goto('https://paytax.erie.gov/webprop/index.asp')
//             let result : any = parser.parseLocation(addressString);
//             const searchHouseNo = result.number;
//             const searchStreet = result.street;

//             if(searchHouseNo != null)
//             {
//                 await page.waitForXPath('//p[contains(.,"Property Address")]/input[1]');
//                 const inputStreetNoXpath = await page.$x('//p[contains(.,"Property Address")]/input[1]');
//                 await inputStreetNoXpath[0].click({clickCount : 3 });
//                 await inputStreetNoXpath[0].type(searchHouseNo.trim());
//             }
//             if(searchStreet != null)
//             {
//                 const inputStreetXpath = await page.$x('//p[contains(.,"Property Address")]/input[2]');
//                 await inputStreetXpath[0].click({clickCount : 3 });
//                 await inputStreetXpath[0].type(searchStreet.trim());
//             }
//             const submitButton = await page.$x('//*[@id="center_column_wide"]/form/input[@type = "submit"]');
//             await Promise.all([
//                 submitButton[0].click(),
//                 page.waitForNavigation()
//             ]);

//             try{
//                 await page.waitForXPath('//*[@id = "generic_site_table"]/tbody/tr/td[starts-with( text() ,"'+searchHouseNo.trim().toUpperCase()+' '+searchStreet.trim().toUpperCase()+'") ]/parent::tr/td[1]/a', {timeout: 1000});
//                 const viewButton = await page.$x('//*[@id = "generic_site_table"]/tbody/tr/td[starts-with( text() ,"'+searchHouseNo.trim().toUpperCase()+' '+searchStreet.trim().toUpperCase()+'") ]/parent::tr/td[1]/a');
//                 await viewButton[0].click();
//                 await page.waitForSelector('#generic_site_table');
//             }
//             catch(err)
//             {
//                 console.log("no house found");
//                 continue;
//             }

//             let ownerNameArray = [];
//             let ownerNameXpath = await page.$x('//*[@id = "generic_site_table"]//tr/th[text() = "Owner"]/following-sibling::td')
//             let ownerName = await page.evaluate(td => td.innerText , ownerNameXpath[0]);
//             let parsedName = this.discriminateAndRemove(ownerName.trim());
//             if(parsedName.type == 'person')
//             {
//                 let nameArray = ownerName.split('&');
//                 ownerNameArray.push(this.parseName(nameArray[0].trim()));
//                 if(nameArray[1] != null)
//                 {
//                     const ownerName1Array = nameArray[1].split(/\b,?\s+\b/);
//                     if(ownerName1Array.length < 3)
//                         nameArray[1]  = ownerNameArray[0].lName + ' ' + nameArray[1]
//                     ownerNameArray.push(this.parseName(nameArray[1]));
//                 }
//             }
//             else
//                 ownerNameArray.push(this.parseName(ownerName.trim()));

//             await page.waitForXPath('//*[@id = "generic_site_table"]//tr/th[text() = "Property Location"]/following-sibling::td');

//             const propertyAddressXpath = await page.$x('//*[@id = "generic_site_table"]//tr/th[text() = "Property Location"]/following-sibling::td');
//             let propertyAddress = await page.evaluate(td => td.innerText , propertyAddressXpath[0]);
//             propertyAddress = propertyAddress.trim();

//             const ownerAddressXpath = await page.$x('//*[@id = "generic_site_table"]//tr/th[text() = "Mailing Address"]/following-sibling::td');
//             let ownerAddress = await page.evaluate(td => td.innerText , ownerAddressXpath[0])
//             ownerAddress = ownerAddress.trim().replace(/\s+/g ,' ');
//             const ownerOccupied = ownerAddress == propertyAddress ? true : false;
            
//             const mailingCityAndStateXpath = await page.$x('//*[@id = "generic_site_table"]//tr/th[text() = "City/State"]/following-sibling::td');
//             let mailingCityAndState = await page.evaluate(td => td.innerText , mailingCityAndStateXpath[0])
//             result = this.parseAddress(mailingCityAndState)
//             const mailingCity = result.city;
//             const mailingState = result.state;  
//             const mailingZipXpath = await page.$x('//*[@id = "generic_site_table"]//tr/th[text() = "Zip"]/following-sibling::td');
//             let mailingZip = await page.evaluate(td => td.innerText , mailingZipXpath[0])

//             await page.waitForXPath('//*[@id = "generic_site_table"]//tr/th[text() = "Assessment"]/following-sibling::td');
//             const assessedValueXpath = await page.$x('//*[@id = "generic_site_table"]//tr/th[text() = "Assessment"]/following-sibling::td');
//             let assessedValue = await page.evaluate(td => td.innerText , assessedValueXpath[0]);
//             assessedValue = assessedValue.trim();

//             await page.waitForXPath('//*[@id = "generic_site_table"]//tr/th[text() = "Property Class"]/following-sibling::td');
//             const propertyTypeXpath = await page.$x('//*[@id = "generic_site_table"]//tr/th[text() = "Property Class"]/following-sibling::td');
//             const propertyTypeString = await page.evaluate(td => td.innerText , propertyTypeXpath[0]);
//             const propertyType = this.parseProperty(propertyTypeString.trim());
            
//             const historyButton = await page.$x('//*[@id = "generic_site_table"]//tr/td/a[text() = "Owner History"]');
//             await historyButton[0].click();
//             let salesDate : string;
//             try{
//                 await page.waitForSelector('#generic_site_table > tbody > tr:last-child > td:last-child',{timeout : 3000});
//                 salesDate = await page.$eval('#generic_site_table > tbody > tr:last-child > td:last-child' , span => span.innerHTML);
//             }
//             catch(err)
//             {
//                 salesDate = '';
//             }           
//             doc["Owner Occupied"] = ownerOccupied;
//             doc["owner_full_name"] = ownerNameArray[0].name;
//             doc["First Name"] = ownerNameArray[0].fName;
//             doc["Last Name"] = ownerNameArray[0].lName;
//             doc["Middle Name"] = ownerNameArray[0].mName;
//             doc["Name Suffix"] = ownerNameArray[0].suffix;
//             doc["Mailing Care of Name"] = '';
//             doc["Mailing Address"] = ownerAddress;
//             doc["Mailing Unit #"] = '';
//             doc["Mailing City"] = mailingCity;
//             doc["Mailing State"] = mailingState;
//             doc["Mailing Zip"] = mailingZip;
//             doc["Property Type"] = propertyType;
//             doc["Total Assessed Value"] = assessedValue;
//             doc["Last Sale Recording Date"] = salesDate;
//             doc["Last Sale Amount"] = '';
//             doc["Est. Remaining balance of Open Loans"] = '';
//             doc["Est Value"] = '';
//             doc["Effective Year Built"] = '';
//             doc["Est Equity"] = '';
//             doc["Lien Amount"] = '';
//             doc.propertyAppraiserProcessed = true;
//             await doc.save();
//             if(ownerNameArray[1]){
//                 let newDocument = await this.cloneMongoDocument(doc)
//                 newDocument["owner_full_name"] = ownerNameArray[1].name;
//                 newDocument["First Name"] = ownerNameArray[1].fName;
//                 newDocument["Last Name"] = ownerNameArray[1].lName;
//                 newDocument["Middle Name"] = ownerNameArray[1].mName;
//                 newDocument["Name Suffix"] = ownerNameArray[1].suffix;
//                 await newDocument.save()
//             }
//         }
//         return true;
//     }

// }