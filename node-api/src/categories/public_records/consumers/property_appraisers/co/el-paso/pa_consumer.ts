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
//         propertyAppraiserPage: 'https://property.spatialest.com/co/elpaso/#'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id = "primary_search"]'
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
//         const list = property.split('span>');
//         const result = list[1].split('(');
//         return result[0];
//     }
//     parseMailingUnit = (address : string) : any =>{
//         const addressUnitDesignatorsArray = ['APT', 'BLDG', 'FL', 'STE', 'UNIT', 'RM', 'DEPT', '#'];
//         const addressUnitRegexString = `\\b\\s(?<unit>${addressUnitDesignatorsArray.join('\\s.+|')}\\s.+)\\b`;
//         const addressUnitRegex = new RegExp(addressUnitRegexString , 'i');
//         const match = address.match(addressUnitRegex);
//         if (match == null) return null;
//         return match.groups?.unit;
//     }
//     parseAddress = (address : string) : any => {
//         const regexAddress = new RegExp(`(?<city>.*),?\\s(?<state>\\w{2})\\s+(?<zip>\\d+)`,'gi');
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

//     async getData(page: puppeteer.Page, doc: IPublicRecordAttributes) {

//         let ownerNameArray = [];
//         let ownerNameXpath = await page.$x('//li/p/span[. = "Owner:"]/following-sibling::*')
//         let ownerName = await page.evaluate(td => td.innerText , ownerNameXpath[0]);
        
//         let parsedName = this.discriminateAndRemove(ownerName.trim());
//         if(parsedName.type == 'person')
//         {
//             let nameArray = ownerName.split('\n');
//             ownerNameArray.push(this.parseName(nameArray[0].trim()));
//             if(nameArray[1] != null)
//             {
//                 const ownerName1Array = nameArray[1].split(/\b,?\s+\b/);
//                 if(ownerName1Array.length < 3)
//                     nameArray[1]  = ownerNameArray[0].lName + ' ' + nameArray[1]
//                 ownerNameArray.push(this.parseName(nameArray[1]));
//             }
//         }
//         else
//             ownerNameArray.push(this.parseName(ownerName.trim()));

//         await page.waitForXPath('//*[@class = "location text-highlight"]/span');

//         const propertyAddressXpath = await page.$x('//*[@class = "location text-highlight"]/span');
//         let propertyAddress = await page.evaluate(td => td.innerText , propertyAddressXpath[0]);
//         propertyAddress = propertyAddress.trim();
//         const propAddrObject = parser.parseLocation(propertyAddress);
//         const propertyCity = propAddrObject.city;
//         const propertyState = propAddrObject.state;
//         const propertyZip = propAddrObject.zip;

//         await page.waitForXPath('//li/p/span[. = "Mailing Address:"]/following-sibling::span');
//         const ownerAddressXpath = await page.$x('//li/p/span[. = "Mailing Address:"]/following-sibling::span');
//         let ownerAddress = await page.evaluate(td => td.innerText , ownerAddressXpath[0])
//         ownerAddress = ownerAddress.trim().replace(/\s+/g ,' ');
//         const ownerOccupied = ownerAddress == propertyAddress ? true : false;

//         const addressObject = parser.parseLocation(ownerAddress);
//         const mailingCity = addressObject.city;
//         const mailingState = addressObject.state;
//         const mailingZip = addressObject.zip;

//         await page.waitForXPath('//li/p/span[. = "Total"]/parent::p/parent::li/p[3]/span');
//         const assessedValueXpath = await page.$x('//li/p/span[. = "Total"]/parent::p/parent::li/p[3]/span');
//         let assessedValue = await page.evaluate(td => td.innerText , assessedValueXpath[0]);
//         assessedValue = assessedValue.trim();

//         const propertyString = await page.$eval('.panel-title a' , a => a.innerHTML);
//         const propertyType = this.parseProperty(propertyString);
        
//         const salesDate = await page.evaluate(() => {
//             let options = Array.from(document.querySelectorAll('#sales table tbody tr td'));
//             return options[1].innerHTML;
//         })
//         const salesPrice = await page.evaluate(() => {
//             let options = Array.from(document.querySelectorAll('#sales table tbody tr td'));
//             return options[2].innerHTML;
//         })
//         const markertValue = await page.$eval('.building-value .text-highlight' , span => span.innerHTML);

//         doc["Owner Occupied"] = ownerOccupied;
//         doc["owner_full_name"] = ownerNameArray[0].name;
//         doc["First Name"] = ownerNameArray[0].fName;
//         doc["Last Name"] = ownerNameArray[0].lName;
//         doc["Middle Name"] = ownerNameArray[0].mName;
//         doc["Name Suffix"] = ownerNameArray[0].suffix;
//         doc["Mailing Care of Name"] = '';
//         doc["Mailing Address"] = ownerAddress;
//         doc["Mailing Unit #"] = '';
//         doc["Mailing City"] = mailingCity;
//         doc["Mailing State"] = mailingState;
//         doc["Mailing Zip"] = mailingZip;
//         doc["Property Type"] = propertyType;
//         doc["Total Assessed Value"] = assessedValue;
//         doc["Last Sale Recording Date"] = salesDate;
//         doc["Last Sale Amount"] = salesPrice;
//         doc["Est. Remaining balance of Open Loans"] = '';
//         doc["Est Value"] = markertValue;
//         doc["Effective Year Built"] = '';
//         doc["Est Equity"] = '';
//         doc["Lien Amount"] = '';
//         if (this.searchBy === 'name') {
//             doc['Property Address'] = propertyAddress;
//             doc['Property City'] = propertyCity;
//             doc['Property State'] = propertyState;
//             doc['Property Zip'] = propertyZip;
//         }
//         doc.propertyAppraiserProcessed = true;
//         console.log(doc);
//         await doc.save();
//         if(ownerNameArray[1]){
//             let newDocument = await this.cloneMongoDocument(doc)
//             newDocument["owner_full_name"] = ownerNameArray[1].name;
//             newDocument["First Name"] = ownerNameArray[1].fName;
//             newDocument["Last Name"] = ownerNameArray[1].lName;
//             newDocument["Middle Name"] = ownerNameArray[1].mName;
//             newDocument["Name Suffix"] = ownerNameArray[1].suffix;
//             console.log('~~~~ cloned');
//             console.log(newDocument);
//             await newDocument.save()
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
//             this.searchBy = doc["Property Address"] ? 'address' : 'name';
//             // do everything that needs to be done for each document here
//             let addressString = '';
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';

//             if (this.searchBy === 'name') {
//                 const nameInfo = this.getNameInfo(doc);
//                 first_name = nameInfo.first_name;
//                 last_name = nameInfo.last_name;
//                 owner_name = nameInfo.owner_name;
//                 owner_name_regexp = nameInfo.owner_name_regexp;
//                 if (owner_name === '') continue;
//                 console.log(`Looking for owner: ${owner_name}`);
//             }
//             else {
//                 addressString = doc["Property Address"];
//                 console.log(`Looking for address: ${addressString}`);
//             }

//             const input = (await page.$('#primary_search'))!;
//             await input.click({ clickCount: 3 })
//             await input.type(this.searchBy === 'name' ? owner_name : addressString);
//             if (this.searchBy === 'address') {
//                 await page.waitForSelector('.search-bar-container .primary-button');
//                 await page.click('.search-bar-container .primary-button');
//                 await page.waitForSelector('.select-dropdown');
                
//                 await page.evaluate(() => {
//                     let options : Array<any> | undefined = Array.from(document.querySelectorAll('.select-dropdown button'));
//                     options?.find(option => option.innerHTML === 'Address')?.click();
//                 })
//             }
//             await page.click('button[title="Submit search query"]');
//             await page.waitFor(() => 
//                 document.querySelectorAll('#keyinformation,#main-app > div > div:nth-child(1) > div.search-results.without-map.container').length
//             );
//             if(await page.$('#keyinformation') == null)
//             {   
//                 if((await page.$x('//h3[contains(., "No results found")]'))[0] !== undefined) {
//                     console.log("no house found");
//                     continue;
//                 }
//                 else{
//                     try
//                     {
//                         const rows = await page.$x('//a[starts-with(@href, "#/property")]');
//                         const datalinks = [];
//                         if (this.searchBy === 'name') {
//                             for (const row of rows) {
//                                 const {name, link} = await page.evaluate(el => ({name: el.textContent, link: el.href}), row);
//                                 const regexp = new RegExp(owner_name_regexp);
//                                 if (!regexp.exec(name.toUpperCase())) continue;
//                                 datalinks.push(link);
//                             }
//                             for (const datalink of datalinks) {
//                                 await page.goto(datalink, {waitUntil: 'load'});
//                                 await page.waitForXPath('//*[@id = "keyinformation"]');
//                                 await this.getData(page, doc);
//                             }
//                             continue;
//                         }
//                         else {
//                             await page.waitForXPath('//a//div/span[@text = "'+ addressString.toUpperCase() +'"]', {timeout : 3000});
//                             const viewButtonXpath = await page.$x('//a//div/span[@text = "'+ addressString.toUpperCase() +'"]');
//                             // await page.waitFor(2000);
//                             await viewButtonXpath[0].click();
//                             await page.waitForXPath('//*[@id = "keyinformation"]');
//                         }
//                     }
//                     catch(err)
//                     {
//                         console.log("no house found");
//                         continue;
//                     }
//                 }
//             }
//             await this.getData(page, doc);
//         }
//         return true;
//     }

// }