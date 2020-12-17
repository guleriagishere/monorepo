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
//         propertyAppraiserPage: 'https://www.dentoncad.com/',
//         propertyAppraiserAdvancedPage: 'https://www.dentoncad.com/home/advanced'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id="propsearch-bar"]/span/input'
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
//         const regexAddress = new RegExp(`^.+\\s+(?<city>.*),\\s+(?<state>\\w{2})\\s(?<zip>.+)\\b`,'gi');
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

//     getAddressFromParsed(parsed: any): string {
//         let address = '';
//         if (parsed.number) address = parsed.number + ' ';
//         if (parsed.prefix) address += parsed.prefix + ' ';
//         if (parsed.street) address += parsed.street + ' ';
//         if (parsed.type) address += parsed.type + ' ';
//         address = address.replace(/\s+/g, ' ').trim().toUpperCase();
//         return address;
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

//         const page = this.browserPages.propertyAppraiserPage!;
//         await page.setDefaultNavigationTimeout(0);

//         for (let document of docsToParse) {
//             if (!this.decideSearchByV2(document)) {
//                 console.log('Insufficient info for Owner and Property');
//                 continue;
//             }

//             // do everything that needs to be done for each document here
//             let addressString = '';
            
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';
            
//             const url = this.searchBy === 'name' ? this.urls.propertyAppraiserAdvancedPage : this.urls.propertyAppraiserPage;
//             await page.goto(url);
            
//             if (this.searchBy === 'name') {
//                 const nameInfo = this.getNameInfo(document.ownerId);
//                 first_name = nameInfo.first_name;
//                 last_name = nameInfo.last_name;
//                 owner_name = nameInfo.owner_name;
//                 owner_name_regexp = nameInfo.owner_name_regexp;
//                 if (owner_name === '') continue;

//                 console.log('Looking for Owner: ', owner_name);
                
//                 await page.waitForSelector('input#owner_id');
//                 const inputName =  (await page.$('input#owner_id'))!;
//                 await inputName.type(owner_name);
//             }
//             else {
//                 addressString = document.propertyId["Property Address"];

//                 await page.waitForSelector('#propsearch-bar > span > input');
//                 const inputStreet = (await page.$('#propsearch-bar > span > input'))!;
//                 await inputStreet.type(addressString.trim());
//             }
//             await Promise.all([
//                 page.keyboard.press('Enter'),
//                 page.waitForNavigation({waitUntil: 'networkidle0'})
//             ]);

//             const datalinks = [];
//             if (this.searchBy === 'name') {
//                 try {
//                     let owner_name_handles = await page.$x('//*[contains(@class, "result-card")]/div[1]/p[3]');
//                     let link_handles = await page.$x('//*[contains(@class, "result-card")]/div[2]/a[1]');
//                     let index = 0;
//                     for (let owner_name_handle of owner_name_handles) {
//                         const owner_name_get = await page.evaluate(el => el.textContent, owner_name_handle);
//                         const regexp = new RegExp(owner_name_regexp);
//                         if (regexp.exec(owner_name_get.toUpperCase())) {
//                             const datalink = await page.evaluate(el => el.href, link_handles[index]);
//                             datalinks.push(datalink);
//                         }
//                         index++;
//                     }
//                 }
//                 catch (err) {
//                     console.log("no house found");
//                     continue;
//                 }
//             }
//             else {
//                 try{
//                     await page.waitForXPath('//h6[starts-with( text() ,"'+addressString.toUpperCase()+'") ]/parent::div/following-sibling::div/a', {timeout: 5000});
//                     await page.waitFor(2000)
//                     const viewAddress = await page.$x('//h6[starts-with( text() ,"'+addressString.toUpperCase()+'") ]/parent::div/following-sibling::div/a');
//                     const datalink = await page.evaluate(el => el.href, viewAddress[0]);
//                     datalinks.push(datalink);
//                 }
//                 catch(err)
//                 {
//                     console.log("no house found");
//                     continue;
//                 }
//             }

//             console.log(datalinks)
            
//             for (let datalink of datalinks) {
//                 await Promise.all([
//                     page.goto(datalink, {waitUntil: 'load'}),
//                     page.waitForXPath('//dl/dt[contains(. , "Owner Name")]/following-sibling::dd/a')
//                 ]);

//                 let ownerNameArray = [];
//                 let ownerNameXpath = await page.$x('//dl/dt[contains(. , "Owner Name")]/following-sibling::dd/a');
//                 let ownerName = await page.evaluate(td => td.innerText , ownerNameXpath[0]);
//                 ownerName = ownerName.trim().replace(/search\b/ , '');
//                 if(ownerName == 'Not Available')
//                 {
//                     console.log("Not Available Data");
//                     continue;
//                 }
//                 let parsedName = this.discriminateAndRemove(ownerName.trim());
//                 if(parsedName.type == 'person')
//                 {
//                     let nameArray = ownerName.split(' & ');
//                     ownerNameArray.push(this.parseName(nameArray[0].trim()));
//                     if(nameArray[1] != null)
//                     {
//                         const ownerName1Array = nameArray[1].split(/\b,?\s+\b/);
//                         if(ownerName1Array.length < 3)
//                             nameArray[1]  = ownerNameArray[0].lName + ' ' + nameArray[1]
//                         ownerNameArray.push(this.parseName(nameArray[1]));
//                     }
//                 }
//                 else
//                     ownerNameArray.push(this.parseName(ownerName.trim()));

//                 await page.waitForXPath('//*[@id = "situs-address"]');

//                 const propertyAddressXpath = await page.$x('//*[@id = "situs-address"]');
//                 let propertyAddress = await page.evaluate(td => td.innerText , propertyAddressXpath[0]);
//                 propertyAddress = propertyAddress.trim();
//                 let propertyAddressParsed = parser.parseAddress(propertyAddress);

           
//                 const address1Xpath = await page.$x('//dl/dt[contains(. , "Owner Mailing Address")]/following-sibling::dd[1]');
//                 let address1 = await page.evaluate(td => td.innerText , address1Xpath[0])
//                 const address2Xpath = await page.$x('//dl/dt[contains(. , "Owner Mailing Address")]/following-sibling::dd[2]');
//                 let address2 = await page.evaluate(td => td.innerText , address2Xpath[0])
//                 let ownerAddress = address1.trim() + ' ' + address2.trim();
//                 const ownerOccupied = ownerAddress == propertyAddress ? true : false;
                
//                 let result = this.parseAddress(address2)
//                 const mailingCity = result.city;
//                 const mailingState = result.state;  
//                 const mailingZip = result.zip;

//                 await page.waitForXPath('//dl/dt[contains(. , "Assessed Value")]/following-sibling::dd/strong');
//                 const assessedValueXpath = await page.$x('//dl/dt[contains(. , "Assessed Value")]/following-sibling::dd/strong');
//                 let assessedValue = await page.evaluate(td => td.innerText , assessedValueXpath[0]);
//                 assessedValue = assessedValue.trim();

//                 await page.waitForXPath('//dl/dt[contains(. , "Property Type")]/following-sibling::dd[1]');
//                 const propertyTypeXpath = await page.$x('//dl/dt[contains(. , "Property Type")]/following-sibling::dd[1]');
//                 const propertyTypeString = await page.evaluate(td => td.innerText , propertyTypeXpath[0]);
//                 const propertyType = propertyTypeString.trim();
                
//                 let salesDate : string , salesPrice : string;
//                 try{
//                     await page.waitForXPath('//div/span[contains(., "Deed History")]' ,{timeout : 3000});
//                     const salesDateXpath = await page.$x('//div/span[contains(., "Deed History")]/parent::div/following-sibling::div[2]/table/tbody/tr[1]/td[1]');
//                     salesDate = await page.evaluate(td => td.innerText , salesDateXpath[0]);
//                     salesDate = salesDate.trim();
//                     const salesPriceXpath = await page.$x('//div/span[contains(., "Deed History")]/parent::div/following-sibling::div[2]/table/tbody/tr[1]/td[6]');
//                     salesPrice = await page.evaluate(td => td.innerText , salesPriceXpath[0]);
//                     salesPrice = salesPrice.trim();
//                 }
//                 catch(err)
//                 {
//                     console.log(err);
//                     salesDate = '', salesPrice = '';
//                 }         
                
//                 let dataFromPropertyAppraisers = {
//                     'Full Name': ownerNameArray[0].name,
//                     'First Name': ownerNameArray[0].fName,
//                     'Last Name': ownerNameArray[0].lName,
//                     'Middle Name': ownerNameArray[0].mName,
//                     'Name Suffix': ownerNameArray[0].suffix,
//                     'Mailing Care of Name': '',
//                     'Mailing Address': ownerAddress,
//                     'Mailing Unit #': '',
//                     'Mailing City': mailingCity,
//                     'Mailing State': mailingState,
//                     'Mailing Zip': mailingZip,
//                     'Property Address': this.getAddressFromParsed(propertyAddressParsed),
//                     'Property Unit #': '',
//                     'Property City': propertyAddressParsed.city,
//                     'Property Zip': propertyAddressParsed.zip,
//                     'Property State': 'TX',
//                     'County': 'Dallas',
//                     'Owner Occupied': ownerOccupied,
//                     'Property Type': propertyType,
//                     'Total Assessed Value': assessedValue,
//                     'Last Sale Recording Date': salesDate.trim(),
//                     'Last Sale Amount': salesPrice,
//                     'Est. Remaining balance of Open Loans': '',
//                     'Est Value': '',
//                     'Effective Year Built': '',
//                     'Est Equity': '',
//                     'Lien Amount': ''
//                 };
//                 await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);

//                 // if(ownerNameArray[1]){
//                 //     let newDocument = await this.cloneDocument(docToSave)
//                 //     newDocument["owner_full_name"] = ownerNameArray[1].name;
//                 //     newDocument["First Name"] = ownerNameArray[1].fName;
//                 //     newDocument["Last Name"] = ownerNameArray[1].lName;
//                 //     newDocument["Middle Name"] = ownerNameArray[1].mName;
//                 //     newDocument["Name Suffix"] = ownerNameArray[1].suffix;
//                 //     console.log('~~~ clone');
//                 //     console.log(newDocument);
//                 //     await this.saveToLineItem(newDocument);
//                 //     await this.saveToOwnerProductProperty(newDocument);
//                 // }
//             }
//         }
//         return true;
//     }

// }