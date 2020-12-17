// import puppeteer from 'puppeteer';
// import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
// import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
// import { String } from 'aws-sdk/clients/cloudsearchdomain';


// export default class PAConsumer extends AbstractPAConsumer {
//     source: string;
//     state: string;
//     county: string;
//     categories: string[];

//     urls = {
//         propertyAppraiserPage: 'https://qpublic.schneidercorp.com/Application.aspx?AppID=1054&LayerID=24293&PageTypeID=2&PageID=10065'
//     }

//     xpaths = {
//         isPAloaded: '//div[@class = "modal-footer"]//a[contains(., "Agree")]'
//     }
    
//     discriminateAndRemove = (name : string) => {
//         const companyIdentifiersArray = [ 'GENERAL',  'TRUSTEE',  'TRUSTEES',  'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENT' , 'ESTATE', 'LLP', 'LP', 'HOLDINGS' ,'TRUST' ,'LOAN' ,'CONDOMINIUM' , 'AKA'];
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
//         const addressSuffixArray = ['APT', 'AVE', 'BLVD', 'BLDG', 'CTR', 'CIR', 'CT', 'DR', 'EXPY', 'EXT', 'FT', 'FWY', 'FL', 'HTS', 'HWY', 'IS', 'JCT', 'LN', 'MT', 'PKY', 'PL', 'PO', 'RD', 'RR', 'ST', 'SPG', 'SPGS', 'SQ', 'STE', 'UNIT', 'RM', 'DEPT', '#' , 'TER', 'TPKE' ,'TRL' ,'CV', 'Pkwy'];
//         const addressDirArray = ['N', 'S', 'W', 'E', 'NE', 'NW', 'SE', 'SW'];
//         const addressSuffixRegexString = `\\b(?:${addressSuffixArray.join('\\b.*|')})\\b`;
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
//         const regexAddress = new RegExp(`(?<city>.*),?\\s+(?<state>\\w{2})\\s(?<zip>.+)\\b`,'gi');
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

//         const agreeButton = await page.$x('//div[@class = "modal-footer"]//a[contains(., "Agree")]');
//         await agreeButton[0].click();
//         await page.waitForXPath('//div[@class = "modal-footer"]/a[contains(., "Close")]');
//         const closeButton = await page.$x('//div[@class = "modal-footer"]/a[contains(., "Close")]');
//         await closeButton[0].click();

//         for (let doc of docsToParse) {
//             this.searchBy = doc["Property Address"] ? 'address' : 'name';
//             try {
//                 // do everything that needs to be done for each document here
//                 let addressString = '';
//                 let search_addr = '';
//                 let first_name = '';
//                 let last_name = '';
//                 let full_name = '';
//                 let owner_name = '';
//                 let owner_name_regexp = '';

//                 if (this.searchBy === 'name') {
//                     const nameInfo = this.getNameInfo(doc);
//                     first_name = nameInfo.first_name;
//                     last_name = nameInfo.last_name;
//                     owner_name = nameInfo.owner_name;
//                     owner_name_regexp = nameInfo.owner_name_regexp;
//                     if (owner_name === '') continue;
//                     console.log(`Looking for owner: ${owner_name}`);
//                 }
//                 else {
//                     addressString = doc["Property Address"];
//                 console.log(`Looking for address: ${addressString}`);
//                 }

//                 await page.goto('https://qpublic.schneidercorp.com/Application.aspx?AppID=1054&LayerID=24293&PageTypeID=2&PageID=10065')
//                 if (this.searchBy === 'name') {
//                     await page.waitForXPath('//input[contains(@id, "_txtName")]');
//                     const inputHandle = await page.$x('//input[contains(@id, "_txtName")]');
//                     await inputHandle[0].type(owner_name, {delay: 150});
//                     await Promise.all([
//                     inputHandle[0].type(String.fromCharCode(13), {delay: 150}),
//                     page.waitForNavigation()
//                     ]);
//                 }
//                 else {
//                     await page.waitForXPath('//input[contains(@id, "_txtAddress")]');
//                     const inputHandle = await page.$x('//input[contains(@id, "_txtAddress")]');
//                     await inputHandle[0].type(search_addr, {delay: 150});
//                     await Promise.all([
//                     inputHandle[0].type(String.fromCharCode(13), {delay: 150}),
//                     page.waitForNavigation()
//                     ]);
//                 }

//                 // check to have several results
//                 const manyResults = await page.$x('//table[contains(@id, "_gvwParcelResults")]/tbody/tr');
//                 console.log(manyResults.length)
//                 if (manyResults && manyResults.length > 0) {
//                     const rows = await page.$x('//table[contains(@id, "_gvwParcelResults")]/tbody/tr');
//                     if (rows.length === 0) {
//                         console.log("No results found");
//                         continue;
//                     }
//                     let index = 0;
//                     const datalinks = [];
//                     if (this.searchBy === 'name') {
//                         for (const row of rows) {
//                             let name = await page.evaluate(el => el.children[3].textContent, row);
//                             name = name.replace(/\n|\s+/gm, ' ').trim();
//                             const regexp = new RegExp(owner_name_regexp);
//                             if (regexp.exec(name.toUpperCase())) {
//                                 const datalink = await page.evaluate(el => el.children[1].children[0].href, row);
//                                 datalinks.push(datalink);
//                             }
//                             index++;
//                         }
//                     }
//                     else {
//                         const datalink = await page.evaluate(el => el.children[1].children[0].href, rows[0]);
//                         datalinks.push(datalink);
//                     }
//                     if (datalinks.length === 0) {
//                         console.log("Not Found");
//                         continue;
//                     }
//                     for (const datalink of datalinks) {
//                         await page.goto(datalink, {waitUntil: 'load'});
//                         await this.getData(page, doc);
//                     }
//                 }
//                 else {
//                     await this.getData(page, doc);
//                 }
//             } catch (error) {
//                 console.log(error);
//             }
//         }
//         return true;
//     }

//     async getData(page: puppeteer.Page, doc: IPublicRecordAttributes) {
//         // await page.waitForXPath('//tr//td[contains(.//text(), "Owner Name")]/following-sibling::td');
//         let ownerNameArray = [];
//         let currentOwnerXpath = await page.$x('//*[@id = "ctlBodyPane_ctl01_ctl01_lstOwner_ctl00_lblOwnerAddress"]');
//         let currentOwner = await page.evaluate(td => td.innerHTML , currentOwnerXpath[0]);
//         currentOwner = currentOwner.replace(/\s+/g,' ').replace(/\n/g,'');
//         let ownerArray = currentOwner.split('<br>');

//         let ownerName = ownerArray[0].trim();
//         let parsedName = this.discriminateAndRemove(ownerName);
        
//         if(parsedName.type == 'person')
//         {
//             let nameArray = ownerName.split('&amp;');
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

//         await page.waitForXPath('//tr//th[contains(., "Location Address")]/following-sibling::td/span');
//         const propertyAddressXpath = await page.$x('//tr//th[contains(., "Location Address")]/following-sibling::td/span');
//         let propertyAddress = await page.evaluate(td => td.innerText , propertyAddressXpath[0]);
//         propertyAddress = propertyAddress.trim();

//         let ownerAddress = ownerArray[1].trim() + " " + ownerArray[2].trim();
//         let result = this.parseAddress(ownerArray[2].trim())
//         const mailingCity = result.city;
//         const mailingState = result.state;  
//         const mailingZip = result.zip;

//         const ownerOccupied = ownerAddress == propertyAddress ? true : false;

        
//         await page.waitForXPath('//tr//th[contains(., "Property Class")]/following-sibling::td/span');
//         const propertyTypeXpath = await page.$x('//tr//th[contains(., "Property Class")]/following-sibling::td/span');
//         const propertyType = await page.evaluate(td => td.innerText , propertyTypeXpath[0]);
        
//         await page.waitForXPath('//tr//th[contains(., "Transaction Date")]/following-sibling::td/span');
//         const salesDateXpath = await page.$x('//tr//th[contains(., "Transaction Date")]/following-sibling::td/span');
//         let salesDate = await page.evaluate(td => td.innerText , salesDateXpath[0]);
//         salesDate = salesDate.trim();

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
//         doc["Total Assessed Value"] = '';
//         doc["Last Sale Recording Date"] = salesDate;
//         doc["Last Sale Amount"] = '';
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
//             console.log(newDocument);
//             await newDocument.save()
//         }
//     }

// }