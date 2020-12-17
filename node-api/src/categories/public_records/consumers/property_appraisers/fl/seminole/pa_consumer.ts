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
//         propertyAppraiserPage: 'https://www.scpafl.org/RealPropertySearch'
//     }

//     xpaths = {
//         isPAloaded: '//*[@id = "dnn_ctr446_View_callbackSearch_expHeader_cmbStreet_I"]'
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
//             await this.browserPages.propertyAppraiserPage.goto(this.urls.propertyAppraiserPage, { waitUntil: 'load', timeout: 100000 });
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
//             await this.browserPages.propertyAppraiserPage?.waitForXPath(this.xpaths.isPAloaded, {timeout: 100000});
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
//     async parseAndSave(docsToParse: any): Promise<boolean> {
//         console.log(`Documents to look up: ${docsToParse.length}.`);

//         const page = this.browserPages.propertyAppraiserPage!;
//         await page.setDefaultNavigationTimeout(0);

//         for (let document of docsToParse) {
//             // let docToSave: any = await this.getLineItemObject(doc);
//             if (!this.decideSearchByV2(document)) {
//                 console.log('Insufficient info for Owner and Property');
//                 continue;
//             }
//             // do everything that needs to be done for each document here
//             let addressString = '';
//             let result: any;
//             let first_name = '';
//             let last_name = '';
//             let owner_name = '';
//             let owner_name_regexp = '';

//             if (this.searchBy === 'name') {
//                 const nameInfo = this.getNameInfo(document.ownerId);
//                 first_name = nameInfo.first_name;
//                 last_name = nameInfo.last_name;
//                 owner_name = nameInfo.owner_name;
//                 owner_name_regexp = nameInfo.owner_name_regexp;
//                 if (owner_name === '') continue;
//                 console.log(`Looking for owner: ${owner_name}`);
//             }
//             else {
//                 addressString = document.propertyId["Property Address"]; 
//                 console.log(`Looking for address: ${addressString}`);
//             }

//             await page.goto('https://www.scpafl.org/RealPropertySearch')

//             if (this.searchBy === 'name') {
//                 const inputStreetNo = (await page.$('#dnn_ctr446_View_callbackSearch_expHeader_cmbOwner_I'))!;
//                 await inputStreetNo.click({clickCount : 3 });
//                 await inputStreetNo.type(owner_name.trim(), {delay: 150});
//                 await page.click('#dnn_ctr446_View_callbackSearch_expHeader_ctl04');
//             }
//             else {
//                 result = parser.parseLocation(addressString);
//                 const searchHouseNo = result.number;
//                 const searchStreet = result.street;

//                 if(searchHouseNo != null)
//                 {
//                     await page.waitForSelector('#dnn_ctr446_View_callbackSearch_expHeader_txtAddr_I', {timeout: 100000});
//                     const inputStreetNo = (await page.$('#dnn_ctr446_View_callbackSearch_expHeader_txtAddr_I'))!;
//                     await inputStreetNo.click({clickCount : 3 });
//                     await inputStreetNo.type(searchHouseNo.trim(), {delay: 150});
//                 }
//                 if(searchStreet != null)
//                 {
//                     const inputStreetName = (await page.$('#dnn_ctr446_View_callbackSearch_expHeader_cmbStreet_I'))!;
//                     await inputStreetName.click({clickCount : 3 });
//                     await inputStreetName.type(searchStreet.trim(), {delay: 150});
//                 }
//                 await page.click('#dnn_ctr446_View_callbackSearch_expHeader_ctl05');
//             }

//             await page.waitFor(20000);
//             await page.waitFor(() => 
//                 document.querySelectorAll('#dnn_ctr446_View_callbackSearch_gridResult_DXMainTable, #ctl00_Content_cellOwner2').length
//             );

//             if(await page.$('#dnn_ctr446_View_callbackSearch_gridResult_DXMainTable') != null)
//             {
//                 const ids = [];
//                 if (this.searchBy === 'name') {
//                     const rows = await page.$x('//*[@id="dnn_ctr446_View_callbackSearch_gridResult_DXMainTable"]/tbody/tr[position()>2]');
//                     for (const row of rows) {
//                         const name = await page.evaluate(el => el.children[1].textContent, row);
//                         const regexp = new RegExp(owner_name_regexp);
//                         if (!regexp.exec(name.toUpperCase())) continue;
//                         const id = await page.evaluate(el => el.id, row);
//                         ids.push(id);
//                         break;
//                     }
//                 }
//                 else {
//                     await page.waitForXPath('//*[@id = "dnn_ctr446_View_callbackSearch_gridResult_DXMainTable"]/tbody/tr/td[starts-with( text() ,"'+addressString.toUpperCase()+'") ]', {timeout: 100000});
//                     const row = await page.$x('//*[@id = "dnn_ctr446_View_callbackSearch_gridResult_DXMainTable"]/tbody/tr/td[starts-with( text() ,"'+addressString.toUpperCase()+'") ]');
//                     const id = await page.evaluate(el => el.id, row[0]);
//                     ids.push(id);
//                 }
//                 if (ids.length > 0) {
//                     for (const id of ids) {
//                         try{
//                             console.log(id);
//                             await page.click(`tr#${id} > td:first-child`);
//                             console.log('click');
//                             await page.waitForSelector('#ctl00_Content_cellOwner2');
//                             await this.getData(page, document, result);
//                         }
//                         catch(err)
//                         {
//                             console.log(err)
//                             try{
//                                 await page.waitForSelector('#ctl00_Content_cellOwner2');
//                                 await this.getData(page, document, result);
//                             }
//                             catch(err1)
//                             {
//                                 console.log(err1)
//                                 console.log("no house found");
//                                 continue;
//                             }
//                         }
//                     }
//                 }
//                 else {
//                     console.log("no house found");
//                     continue;
//                 }
//             }
//             else if (await page.$('#ctl00_Content_cellOwner2') !== null) {
//                 await this.getData(page, document, result);
//             }
//             else {
//                 console.log("no house found");
//                 continue;
//             }
//         }
//         return true;
//     }
//     async getData(page: puppeteer.Page, document: any, result: any) {
//         let dataFromPropertyAppraisers: any = {};
//         let ownerNameArray = [];
//         let ownerNameXpath = await page.$x('//*[@id = "ctl00_Content_cellOwner2"]')
//         let ownerName = await page.evaluate(td => td.innerHTML , ownerNameXpath[0]);
//         let parsedName = this.discriminateAndRemove(ownerName.trim());
//         if(parsedName.type == 'person')
//         {
//             let nameArray = ownerName.split('<br>');
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

//         await page.waitForXPath('//*[@id = "ctl00_Content_cellAddress2"]', {timeout: 100000});

//         const propertyAddressXpath = await page.$x('//*[@id = "ctl00_Content_cellAddress2"]');
//         let propertyAddress = await page.evaluate(td => td.innerText , propertyAddressXpath[0]);
//         propertyAddress = propertyAddress.trim();
//         let propertyAddressParsed = parser.parseLocation(propertyAddress);

//         const ownerAddressXpath = await page.$x('//*[@id = "ctl00_Content_cellMailing"]');
//         let ownerAddress = await page.evaluate(td => td.innerText , ownerAddressXpath[0])
//         ownerAddress = ownerAddress.trim().replace(/\s+/g ,' ');
//         const ownerOccupied = ownerAddress == propertyAddress ? true : false;

//         propertyAddress = 
//             ((propertyAddressParsed['number'] ? propertyAddressParsed['number'] + ' ' : '') +
//             (propertyAddressParsed['prefix'] ? propertyAddressParsed['prefix'] + ' ' : '') +
//             (propertyAddressParsed['street'] ? propertyAddressParsed['street'] + ' ' : '') +
//             (propertyAddressParsed['type'] ? propertyAddressParsed['type'] : '')).trim();
        
//         result = this.parseAddress(ownerAddress)
//         const mailingCity = (result && result.city) || '';
//         const mailingState = (result && result.state) || '';  
//         const mailingZip = (result && result.zip) || '';

//         await page.waitForXPath('//tr//td[contains(., "Assessed Value")]/following-sibling::td[2]', {timeout: 100000});
//         const assessedValueXpath = await page.$x('//tr//td[contains(., "Assessed Value")]/following-sibling::td[2]');
//         let assessedValue = await page.evaluate(td => td.innerText , assessedValueXpath[0]);
//         assessedValue = assessedValue.trim();

//         await page.waitForXPath('//*[@id = "ctl00_Content_cellDOR"]', {timeout: 100000});
//         const propertyTypeXpath = await page.$x('//*[@id = "ctl00_Content_cellDOR"]');
//         const propertyTypeString = await page.evaluate(td => td.innerText , propertyTypeXpath[0]);
//         const propertyType = this.parseProperty(propertyTypeString.trim());
        
//         let salesDate : string , salesPrice : string;
//         try{
//             await page.waitForXPath('//*[@id="ctl00_Content_PageControl1_grdSales_DXDataRow0"]/td[2]' ,{timeout : 3000});
//             const salesDateXpath = await page.$x('//*[@id="ctl00_Content_PageControl1_grdSales_DXDataRow0"]/td[2]');
//             salesDate = await page.evaluate(td => td.innerText , salesDateXpath[0]);
//             salesDate = salesDate.trim();
//             const salesPriceXpath = await page.$x('//*[@id="ctl00_Content_PageControl1_grdSales_DXDataRow0"]/td[3]');
//             salesPrice = await page.evaluate(td => td.innerText , salesPriceXpath[0]);
//             salesPrice = salesPrice.trim();
//         }
//         catch(err)
//         {
//             salesDate = '', salesPrice = '';
//         }           
//         dataFromPropertyAppraisers["Owner Occupied"] = ownerOccupied;
//         dataFromPropertyAppraisers["Full Name"] = ownerNameArray[0].name;
//         dataFromPropertyAppraisers["First Name"] = ownerNameArray[0].fName;
//         dataFromPropertyAppraisers["Last Name"] = ownerNameArray[0].lName;
//         dataFromPropertyAppraisers["Middle Name"] = ownerNameArray[0].mName;
//         dataFromPropertyAppraisers["Name Suffix"] = ownerNameArray[0].suffix;
//         dataFromPropertyAppraisers["Mailing Care of Name"] = '';
//         dataFromPropertyAppraisers["Mailing Address"] = ownerAddress;
//         dataFromPropertyAppraisers["Mailing Unit #"] = '';
//         dataFromPropertyAppraisers["Mailing City"] =  mailingCity;
//         dataFromPropertyAppraisers["Mailing State"] = mailingState;
//         dataFromPropertyAppraisers["Mailing Zip"] = mailingZip;
//         dataFromPropertyAppraisers["Property Type"] = propertyType;
//         dataFromPropertyAppraisers["Total Assessed Value"] = assessedValue;
//         dataFromPropertyAppraisers["Last Sale Recording Date"] = salesDate;
//         dataFromPropertyAppraisers["Last Sale Amount"] = salesPrice;
//         dataFromPropertyAppraisers["Est. Remaining balance of Open Loans"] = '';
//         dataFromPropertyAppraisers["Est Value"] = '';
//         dataFromPropertyAppraisers["Effective Year Built"] = '';
//         dataFromPropertyAppraisers["Est Equity"] = '';
//         dataFromPropertyAppraisers["Lien Amount"] = '';
//         // if (this.searchBy === 'name') {
//             dataFromPropertyAppraisers['Property Address'] = propertyAddress;
//             dataFromPropertyAppraisers['Property City'] = propertyAddressParsed.city;
//             dataFromPropertyAppraisers['Property State'] = "FL";
//             dataFromPropertyAppraisers['Property Zip'] = propertyAddressParsed.zip;
//         dataFromPropertyAppraisers['County'] = "Seminole";
//         await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
//         // }
//         // document.propertyAppraiserProcessed = true;
//         // console.log(doc);
//         // await this.saveToLineItem(doc);
//         // await this.saveToOwnerProductProperty(doc);

//         // if(ownerNameArray[1]){
//         //     let newDocument = await this.cloneDocument(doc)
//         //     newDocument["owner_full_name"] = ownerNameArray[1].name;
//         //     newDocument["First Name"] = ownerNameArray[1].fName;
//         //     newDocument["Last Name"] = ownerNameArray[1].lName;
//         //     newDocument["Middle Name"] = ownerNameArray[1].mName;
//         //     newDocument["Name Suffix"] = ownerNameArray[1].suffix;
//         //     console.log(newDocument);
//         //     await this.saveToLineItem(newDocument);
//         //     await this.saveToOwnerProductProperty(newDocument);
//         // }
//     }
// }