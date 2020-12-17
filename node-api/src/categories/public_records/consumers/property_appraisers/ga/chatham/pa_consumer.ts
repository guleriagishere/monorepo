// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// var parser = require('parse-address'); 

// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://www.chathamtax.org/PT/search/commonsearch.aspx?mode=realprop'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id = "btAgree"]'
//     }
    
//     discriminateAndRemove = (name : string) => {
//         const companyIdentifiersArray = [ 'GENERAL',  'TRUSTEE',  'TRUSTEES',  'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENT' , 'ESTATE', 'LLP', 'LP', 'HOLDINGS' ,'TRUST' ,'LOAN' ,'CONDOMINIUM' , 'PROPERTY'];
//         const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS' ,'JTWROS', 'TEN IN COM' , '- *Joint Tenants', '- *Tenancy', 'LLC' ];
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
//         const regexProperty = new RegExp(`-\\s(?<property>.+)`,'gi');
//         const match = regexProperty.exec(property);
//         if (match == null) return null;
//         return match.groups?.property;
//     }
    
//     parseAddress = (address : string) : any => {
//         const regexAddress = new RegExp(`(?<city>.*)\\s+(?<state>\\w{2})\\s(?<zip>.+)\\b`,'gi');
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
//         let ownerNameXpath = await page.$x('//tr[contains(@class ,"DataletHeaderBottom")]//td[contains(@class ,"DataletHeaderBottom")][1]')
//         let ownerName = await page.evaluate(td => td.innerText , ownerNameXpath[0]);
//         ownerName = ownerName.replace(/\n/g,' ').replace('*','');
//         let parsedName = this.discriminateAndRemove(ownerName.trim());
//         if(parsedName.type == 'person')
//         {
//             let nameArray = ownerName.split('&');
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

//         await page.waitForXPath('//tr[contains(@class ,"DataletHeaderBottom")]//td[contains(@class ,"DataletHeaderBottom")][2]');
//         const propertyAddressXpath = await page.$x('//tr[contains(@class ,"DataletHeaderBottom")]//td[contains(@class ,"DataletHeaderBottom")][2]');
//         let propertyAddress = await page.evaluate(td => td.innerText , propertyAddressXpath[0]);
//         propertyAddress = propertyAddress.trim();
//         await page.waitForXPath('//*[@id="Most Current Owner"]//td[contains(@class, "DataletData")][last()]');
//         const ownerAddressXpath = await page.$x('//*[@id="Most Current Owner"]//td[contains(@class, "DataletData")][last()]');
//         let ownerAddress = await page.evaluate(td => td.innerHTML , ownerAddressXpath[0])
//         let ownerAddressArray = ownerAddress.split('\n');
//         ownerAddress = ownerAddress.replace(/\n/g ,' ');
//         let result = this.parseAddress(ownerAddressArray.pop())
//         const mailingCity = result.city;
//         const mailingState = result.state;  
//         const mailingZip = result.zip;

//         const ownerOccupied = ownerAddress == propertyAddress ? true : false;

        
//         await page.waitForXPath('//tr//td[contains(.//text(), "Property Class")]/following-sibling::td');
//         const propertyTypeXpath = await page.$x('//tr//td[contains(.//text(), "Property Class")]/following-sibling::td');
//         const propertyType = await page.evaluate(td => td.innerText , propertyTypeXpath[0]);
        
//         await page.waitForXPath('//a//span[contains(.//text(), "Value History")]');
//         const valuesButton = await page.$x('//a//span[contains(.//text(), "Value History")]');
//         await valuesButton[0].click();

//         let assessedValue : string ;
//         try{
//             await page.waitForXPath('//*[@id="Assessed Values"]/tbody/tr[2]/td[contains(@class, "DataletData")][last()]', {timeout : 3000});
//             const assessedValueXpath = await page.$x('//*[@id="Assessed Values"]/tbody/tr[2]/td[contains(@class, "DataletData")][last()]');
//             assessedValue = await page.evaluate(td => td.innerText , assessedValueXpath[0]);
//             assessedValue = assessedValue.trim();    
//         }
//         catch(err){
//             assessedValue = '';
//         }
//         let marketValue : string ;
//         try{
//             const marketValueXpath = await page.$x('//*[@id="Appraised Values"]/tbody/tr[2]/td[contains(@class, "DataletData")][last()-1]');
//             marketValue = await page.evaluate(td => td.innerText , marketValueXpath[0]);
//             marketValue = marketValue.trim();
//         }
//         catch(err)
//         {
//             marketValue = '';
//         }
        

        
//         await page.waitForXPath('//a//span[text()= "Sales"]');
//         const salesButton = await page.$x('//a//span[text()= "Sales"]');
//         await salesButton[0].click();

//         let salesDate , salesPrice;
//         try{
//             await page.waitForXPath('//*[@id="Sales"]/tbody/tr[2]/td[contains(@class, "DataletData")][1]' , {timeout : 3000});
//             const salesDateXpath = await page.$x('//*[@id="Sales"]/tbody/tr[2]/td[contains(@class, "DataletData")][1]');
//             salesDate = await page.evaluate(td => td.innerText , salesDateXpath[0]);
//             salesDate = salesDate.trim();
//             const salesPriceXpath = await page.$x('//*[@id="Sales"]/tbody/tr[2]/td[contains(@class, "DataletData")][2]');
//             salesPrice = await page.evaluate(td => td.innerText , salesPriceXpath[0]);
//             salesPrice = salesPrice.trim();
//         }
//         catch(err)
//         {
//             salesDate = "";
//             salesPrice = "";
//         }

//         doc["Owner Occupied"] = ownerOccupied;
//         doc["owner_full_name"] = ownerNameArray[0].name;
//         doc["First Name"] = ownerNameArray[0].fName;
//         doc["Last Name"] = ownerNameArray[0].lName;
//         doc["Middle Name"] = ownerNameArray[0].mName;
//         doc["Name Suffix"] = ownerNameArray[0].suffix;
//         doc["Property Address"] = propertyAddress;
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
//         doc["Est Value"] = '';
//         doc["Effective Year Built"] = '';
//         doc["Est Equity"] = '';
//         doc["Lien Amount"] = '';
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
//         await page.click('#btAgree');

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

//             await page.goto('https://www.chathamtax.org/PT/search/commonsearch.aspx?mode=realprop')

//             if (this.searchBy === 'name') {
//                 const inputName = (await page.$('#inpOwner1'))!;
//                 await inputName.type(owner_name, {delay: 100});
//             }
//             else {
//                 let result : any = parser.parseLocation(addressString);
//                 const searchHouseNo = result.number;
//                 const searchStreet = result.street;
//                 const searchUnitNum = result.sec_unit_num;
//                 if(searchHouseNo != null)
//                 {
//                     await page.waitForSelector('#inpNo');
//                     const inputStreetNo = (await page.$('#inpNo'))!;
//                     await inputStreetNo.click({clickCount : 3 });
//                     await inputStreetNo.type(searchHouseNo.trim());
//                 }
//                 if(searchStreet != null)
//                 {
//                     const inputStreetName = (await page.$('#inpStreet'))!;
//                     await inputStreetName.click({clickCount : 3 });
//                     await inputStreetName.type(searchStreet.trim());
//                 }
//                 if(searchUnitNum != null)
//                 {
//                     const inputStreetUnit = (await page.$('#inpZip'))!;
//                     await inputStreetUnit.click({clickCount : 3 });
//                     await inputStreetUnit.type(searchUnitNum.trim());
//                 }
//             }

//             await page.click('#btSearch');
//             try
//             {
//                 await page.waitForXPath('//*[@id="searchResults"]/tbody/tr[3]/td[3]', {timeout : 10000});

//                 const rows = await page.$x('//*[@id="searchResults"]/tbody/tr[position()>2]');
//                 const propIds = [];
//                 if (this.searchBy === 'name') {
//                     for (const row of rows) {
//                         const {name, id} = await page.evaluate(el => ({name: el.children[1].textContent.trim(), id: el.children[0].textContent.trim()}), row);
//                         const regexp = new RegExp(owner_name_regexp);
//                         if (!regexp.exec(name.toUpperCase())) continue;
//                         propIds.push(id);
//                         // break;
//                     }
//                     for (const id of propIds) {
//                         const viewButtonXpath = await page.$x(`//*[contains(text(), "${id}")]/ancestor::tr/td[3]`);
//                         await page.waitFor(2000);
//                         await Promise.all([
//                             viewButtonXpath[0].click(),
//                             page.waitForNavigation()
//                         ]);
//                         await page.waitForXPath('//tr[contains(@class ,"DataletHeaderBottom")]//td[contains(@class ,"DataletHeaderBottom")][1]');
//                         await this.getData(page, doc);
//                         await page.goBack();
//                         await page.goBack();
//                         await page.goBack();
//                         await page.waitForXPath('//*[@id="searchResults"]/tbody/tr[3]/td[3]', {timeout : 10000});
//                     }
//                     continue;
//                 }
//                 else {
//                     const viewButtonXpath = await page.$x('//*[@id="searchResults"]/tbody/tr[3]/td[3]');
//                     await page.waitFor(2000);
//                     await viewButtonXpath[0].click();
//                     await page.waitForXPath('//tr[contains(@class ,"DataletHeaderBottom")]//td[contains(@class ,"DataletHeaderBottom")][1]');
//                 }
//                 await this.getData(page, doc);
//             }
//             catch(err)
//            {
//                 console.log("no house found");
//                 continue;
//             }
//         }
//         return true;
//     }

// }