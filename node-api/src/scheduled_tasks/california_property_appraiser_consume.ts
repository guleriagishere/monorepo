import { config as CONFIG } from '../config';
import { IConfigEnv } from '../iconfig';
const config: IConfigEnv = CONFIG[process.env.NODE_ENV || 'production'];
import puppeteer from 'puppeteer';
const nameParsingService = require('../categories/public_records/consumers/property_appraisers/consumer_dependencies/nameParsingService');
const addressService = require('../categories/public_records/consumers/property_appraisers/consumer_dependencies/addressService');
const parseAddress = require('parse-address');
import db, { PublicRecordOwner, PublicRecordOwnerProductProperty, PublicRecordProperty } from '../models/db';
import { sleep } from '../core/sleepable';

( async() => {
    const usernameParcelQuest = 'j8fbjkrt';
    const passwordParcelQuest = 'qvmxwx';
    const limit = 290; // 24 * 60 / 5 = 288 times in one day
    let countLimit = 0;

    const saveToNewSchema = async (data: any, source: string, oppId: string) => {
        // If the data has full name and property address
        console.log('\n// =============== NEW PUBLIC RECORD ===============');
        let owner_id = null;
        let property_id = null;

        let ownerProductProperty = await db.models.OwnerProductProperty.findOne({ _id: oppId });
        let product_id = ownerProductProperty.productId;
        console.log(`///// PRODUCT id = ${product_id}`);
        
        if (source === 'name') {
            owner_id = ownerProductProperty.ownerId;
            console.log(`///// OWNER id = ${owner_id}`);
            // need to create property or find existing
            try {
                console.log('///// PROPERTY');
                if (data['Property Address']) {
                    let property = await db.models.Property.findOne({ 'Property Address': data['Property Address'], 'Property State': data['Property State'], 'County': normalizeStringForMongo(data['County']) });
                    if(!property){
                        let dataForProperty = {
                            'Property Address': data['Property Address'],
                            'County': normalizeStringForMongo(data['County']),
                            'Property Unit #': data['Property Unit #'] || '',
                            'Property City': data['Property City'] || '',
                            'Property State': data['Property State'] || '',
                            'Property Zip': data['Property Zip'] || '',
                            'Owner Occupied': data['Owner Occupied'] || false,
                            'Property Type': data['Property Type'] || '',
                            'Total Assessed Value': data['Total Assessed Value'] || '',
                            'Last Sale Recording Date': data['Last Sale Recording Date'] || '',
                            'Last Sale Amount': data['Last Sale Amount'] || '',
                            'Est. Remaining balance of Open Loans': data['Est. Remaining balance of Open Loans'] || '',
                            'Est Value': data['Est Value'] || '',
                            'Effective Year Built': data['Effective Year Built'] || '',
                            'Est Equity': data['Est Equity'] || '',
                            'Lien Amount': data['Lien Amount'] || '',
                            vacancyProcessed: false
                        }
                        property = new PublicRecordProperty(dataForProperty);
                        await property.save();
                        property_id = property._id;
                        console.log(`--- NEW PROPERTY ${property_id}`);
                    } else if(property) {
                        property['Owner Occupied'] = data['Owner Occupied'] || false;
                        property['Property Type'] = data['Property Type'] || '';
                        property['Total Assessed Value'] = data['Total Assessed Value'] || '';
                        property['Last Sale Recording Date'] = data['Last Sale Recording Date'] || '';
                        property['Last Sale Amount'] = data['Last Sale Amount'] || '';
                        property['Est. Remaining balance of Open Loans'] = data['Est. Remaining balance of Open Loans'] || '';
                        property['Est Value'] = data['Est Value'] || '';
                        property['Effective Year Built'] = data['Effective Year Built'] || '';
                        property['Est Equity'] = data['Est Equity'] || '';
                        property['Lien Amount'] = data['Lien Amount'] || '';
                        await property.save();
                        property_id = property._id;
                        console.log(`--- OLD PROPERTY ${property_id}`);
                    }
                    console.log(property);
                }
            } catch (error){
                // pass duplicates or error data
                console.log(error);
                console.log(data);
                return false;
            }
        }
        else if (source === 'property') {
            property_id = ownerProductProperty.propertyId;
            console.log(`///// PROPERTY id = ${property_id}`);
            // need to create owner or find owner
            try{
                console.log('///// OWNER');
    
                if (data['Full Name']) {
                    let owner = await db.models.Owner.findOne({ 'Full Name': data['Full Name'], 'County': normalizeStringForMongo(data['County']), 'Property State': data['Property State'] });
                    if (!owner) {
                        let dataForOwner = {
                            'Full Name': data['Full Name'],
                            'County': normalizeStringForMongo(data['County']),
                            'Property State': data['Property State'],
                            'First Name': data['First Name'] || '',
                            'Last Name': data['Last Name'] || '',
                            'Middle Name': data['Middle Name'] || '',
                            'Name Suffix': data['Name Suffix'] || '',
                            'Mailing Care of Name': data['Mailing Care of Name'] || '',
                            'Mailing Address': data['Mailing Address'] || '',
                            'Mailing Unit #': data['Mailing Unit #'] || '',
                            'Mailing City': data['Mailing City'] || '',
                            'Mailing State': data['Mailing State'] || '',
                            'Mailing Zip': data['Mailing Zip'] || ''
                        };
                        owner = new PublicRecordOwner(dataForOwner);
                        await owner.save();
                        owner_id = owner._id;
                        console.log(`--- NEW OWNER ${owner_id}`);
                    } else if(owner) {
                        owner['Mailing Care of Name'] = data['Mailing Care of Name'] || '';
                        owner['Mailing Address'] = data['Mailing Address'] || '',
                        owner['Mailing Unit #'] = data['Mailing Unit #'] || '',
                        owner['Mailing City'] = data['Mailing City'] || '',
                        owner['Mailing State'] = data['Mailing State'] || '',
                        owner['Mailing Zip'] = data['Mailing Zip'] || '',
                        await owner.save();
                        owner_id = owner._id;
                        console.log(`--- OLD OWNER ${owner_id}`);
                    }
                    console.log(owner);
                }
            } catch (error){
                // pass duplicates or error data
                console.log(error);
                console.log(data);
                return false;
            }
        }

        try {
            console.log('///// OWNER_PRODUCT_PROPERTY')            
            if (owner_id === null || property_id === null) {
                return false;
            } else {
                let isNew = false;
                let temp = await db.models.OwnerProductProperty.findOne({ ownerId: owner_id, propertyId: property_id, productId: product_id }); 
                if (temp) {
                    temp.propertyAppraiserProcessed = true;
                    await temp.save();
                    console.log(`--- OLD OWNER_PRODUCT_PROPERTY id = ${temp._id}`);
                }
                else {
                    if (source === 'name') {
                        if (ownerProductProperty.propertyId !== null) {
                            let dataForOwnerProductProperty = {
                                ownerId: owner_id,
                                propertyId: property_id,
                                productId: product_id,
                                propertyAppraiserProcessed: true
                            }
                            ownerProductProperty = new PublicRecordOwnerProductProperty(dataForOwnerProductProperty);
                            await ownerProductProperty.save();
                            isNew = true;
                            console.log(`--- NEW OWNER_PRODUCT_PROPERTY id = ${ownerProductProperty._id}`);
                        }
                        else {
                            ownerProductProperty.propertyId = property_id;
                            ownerProductProperty.propertyAppraiserProcessed = true;
                            await ownerProductProperty.save();
                            console.log(`--- OLD OWNER_PRODUCT_PROPERTY id = ${ownerProductProperty._id}`);
                        }
                    }
                    if (source === 'property') {
                        if (ownerProductProperty.ownerId !== null) {
                            let dataForOwnerProductProperty = {
                                ownerId: owner_id,
                                propertyId: property_id,
                                productId: product_id,
                                propertyAppraiserProcessed: true
                            }
                            ownerProductProperty = new PublicRecordOwnerProductProperty(dataForOwnerProductProperty);
                            await ownerProductProperty.save();
                            isNew = true;
                            console.log(`--- NEW OWNER_PRODUCT_PROPERTY id = ${ownerProductProperty._id}`);
                        }
                        else {
                            ownerProductProperty.ownerId = owner_id;
                            ownerProductProperty.propertyAppraiserProcessed = true;
                            await ownerProductProperty.save();
                            console.log(`--- OLD OWNER_PRODUCT_PROPERTY id = ${ownerProductProperty._id}`);
                        }
                    }
                }

                console.log('================================================= //');
                return isNew;
            }
        } catch (error){
            // pass duplicates or error data
            console.log(error);
            console.log(data);
            return false;
        }        
    }

    async function launchBrowser(): Promise<puppeteer.Browser> {
        return await puppeteer.launch({
            headless: config.puppeteer_headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            ignoreDefaultArgs: ['--disable-extensions'],
            ignoreHTTPSErrors: true
        });
    }

    async function setParamsForPage(page: puppeteer.Page): Promise<void> {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.0 Safari/537.36');
        await page.setViewport({ height: 800, width: 1200 });
    }

    const loginParcelQuest = async (page: any) => {
        const inputUsernameSelector = '#txtName';
        const inputPasswordSelector = '#txtPwd';
        const loginButtonXpath = '//input[@value="log in"]';
        const inputAddressSelector = '#QuickSearch_StreetAddress';
        await page.goto('https://pqweb.parcelquest.com/', {waitUntil: 'networkidle0', timeout: 100000}); // Goto login page
        console.log(await page.content());
        await page.evaluate(() => {
            // @ts-ignore
            document.getElementById('txtName')!.value = '';
            // @ts-ignore
            document.getElementById('txtPwd')!.value = '';
        })
        try{
            await page.type(inputUsernameSelector, usernameParcelQuest);
            await page.type(inputPasswordSelector, passwordParcelQuest);
            let loginButton = await page.$x(loginButtonXpath);
            await loginButton[0].click();
        } catch(e){
            console.log(e);
            return false;
        }
        try {
            await page.waitForSelector(inputAddressSelector);
            return page;
        } catch (error) {
            console.log("Something wrong with the ParcelQuest account.");
            return false;
        }
    }

    const searchAddress = async (page: any, county: string, address: string) => {
        try {
            const separateAddress = parseAddress.parseLocation(address);
            if (separateAddress.sec_unit_type && separateAddress.sec_unit_num) {
                const regex = new RegExp(`${separateAddress.sec_unit_type}.*$`, 'i');
                address = address.replace(regex, '');
                address.trim()
            }
            await page.waitFor(5000);
            await page.waitForSelector('#QuickSearch_CountyId', {visible: true});
            let option = (await page.$x('//select[@id="QuickSearch_CountyId"]/option[contains(., "' + normalizeForSelect(county) + '")]'))[0];
            let optionVal: any = await (await option.getProperty('value')).jsonValue();
            await page.select("#QuickSearch_CountyId", optionVal);
            await page.waitForSelector('#QuickSearch_StreetAddress', {visible: true});
            await page.click('#QuickSearch_StreetAddress', { clickCount: 3 });
            console.log(addressService.normalizeAddress(address));
            await page.type('#QuickSearch_StreetAddress',addressService.normalizeAddress(address));
            await page.click('#Quick .btnQuickSearch');
            await page.waitForSelector('#resultsTable', {visible: true});
            const [totalFoundElement] = await page.$x('//*[@id="resultsTotal"]/span');
            const totalFound = await page.evaluate((j: any) => j.innerText, totalFoundElement);
            if (totalFound == 0) {
                return false;
            }
            await page.waitForXPath('//button[contains(text(),"View Results")]', {visible: true});
            return true;
        } catch (e) {
            console.log(e);
            console.log('Search error');
            return false;
        }
    }

    const searchName = async (page: any, county: string, name: string) => {
        try {
            await page.waitFor(5000);
            await page.waitForSelector('#QuickSearch_CountyId', {visible: true});
            let option = (await page.$x('//select[@id="QuickSearch_CountyId"]/option[contains(., "' + normalizeForSelect(county) + '")]'))[0];
            let optionVal: any = await (await option.getProperty('value')).jsonValue();
            await page.select("#QuickSearch_CountyId", optionVal);
            await page.waitForSelector('#QuickSearch_StreetAddress', {visible: true});
            await page.click('#QuickSearch_OwnerName', { clickCount: 3 });
            console.log(name);
            await page.type('#QuickSearch_OwnerName', name);
            await page.click('#Quick .btnQuickSearch');
            await page.waitForSelector('#resultsTable', {visible: true});
            const [totalFoundElement] = await page.$x('//*[@id="resultsTotal"]/span');
            const totalFound = await page.evaluate((j: any) => j.innerText, totalFoundElement);
            if (totalFound == 0) {
                return false;
            }
            await page.waitForXPath('//button[contains(text(),"View Results")]', {visible: true});
            return true;
        } catch (e) {
            console.log('Search error');
            return false;
        }
    }

    function normalizeForSelect(county: string){
        county = county.toLowerCase().replace('-',' ');
        let countyArr = county.split(/\s+/g);
        let result = '';
        for(let word of countyArr){
            word = word[0].toUpperCase() + word.substring(1);
            result += word + ' ';
        }
        return result.trim();
    }

    const normalizeStringForMongo = (sourceString: string) => {
        return sourceString.toLocaleLowerCase().replace('_', '-').replace(/[^A-Z\d\s\-]/ig, '').replace(/\s+/g, '-');
    }

    const getJsonDataAfterViewResult = async (page: any, propertyAddress: string) => {
        const separateAddress = parseAddress.parseLocation(propertyAddress);
        await page.setRequestInterception(true);
        const finalResponse = await page.waitForResponse((response: any) =>
            response.url().includes('api/breeze/Parcels') &&
            !response.url().includes('SrchId%20eq%20%270%27') &&
            response.url().includes('results') &&
            response.status() === 200);
        const data = await finalResponse.json();
        if (data.page.length == 0) {
            console.log("Json is no data.");
            return false;
        } else {
            if (separateAddress.sec_unit_type && separateAddress.sec_unit_num) {
                const foundData = data.page.find((item: any) => item.s_unit == separateAddress.sec_unit_num);
                return foundData;
            }
            return data.page[0];
        }
    }

    const getJsonDataAfterViewName = async (page: any) => {
        await page.setRequestInterception(true);
        const finalResponse = await page.waitForResponse((response: any) =>
            response.url().includes('api/breeze/Parcels') &&
            !response.url().includes('SrchId%20eq%20%270%27') &&
            response.url().includes('results') &&
            response.status() === 200);
        const data = await finalResponse.json();
        if (data.page.length == 0) {
            console.log("Json is no data.");
            return false;
        } else {
            return data.page[0];
        }
    }

    const parseJsonData = async (data: any, county: string) => {
        let processedNamesArray = nameParsingService.parseOwnersFullNameWithoutComma(data.owner1.replace('ET AL', '').trim());
        data.owner2 && processedNamesArray.push(...nameParsingService.parseOwnersFullNameWithoutComma(data.owner2));
        const mailing_streetAndNumber = data.m_addr_d;
        const mailing_city = data.m_city;
        const mailing_state = data.m_st;
        const mailing_zip = data.m_zip;
        const property_streetAndNumber = data.s_streetaddr;
        const property_zip = data.zipcode;
        const property_city = data.s_city;
        const isOwnerOccupied = addressService.comparisonAddresses(mailing_streetAndNumber, property_streetAndNumber);
        const propertyType = data.usedesc;
        const grossAssessedValue = data.assdvalue;
        const effYearBuilt = data.yreff;
        const lastSaleDate = data.sale1rd;
        const lastSaleAmount = data.sale1sp;
        return {
            'owner_names': processedNamesArray,
            'Unit#': '',
            'Property Address':  property_streetAndNumber,
            'Property Unit #': '',
            'Property City': property_city,
            'Property Zip': property_zip,
            'Property State': 'CA',
            'County': county,
            'Owner Occupied': isOwnerOccupied,
            'Mailing Care of Name': '',
            'Mailing Address': mailing_streetAndNumber,
            'Mailing Unit #': '',
            'Mailing City': mailing_city,
            'Mailing State': mailing_state,
            'Mailing Zip': mailing_zip,
            'Property Type': propertyType,
            'Total Assessed Value': grossAssessedValue,
            'Last Sale Recoding Date': lastSaleDate,
            'Last Sale Amount': lastSaleAmount,
            'Est. Value': '',
            'Effective Year Built': effYearBuilt,
            'Est. Equity': '',
        };
    }

    const startParsing = async (browser: any, opp: any, source: string) => {
        let page = await browser.newPage();
        await setParamsForPage(page);
        await page.setCacheEnabled(false);
        let login = await loginParcelQuest(page);
        if(!login){
            await page.close();
            return false;
        }
        if(source == 'property'){
            console.log("==== SEARCHED BY ADDRESS ====");
            console.log("Searching for Property Address:",opp.propertyId['Property Address']);
        } else {
            console.log("==== SEARCHED BY NAME ====");
            console.log("Searching for Name:", normalizeNameForSearch(opp.ownerId['Full Name']));
        }
        try {
            let dataFromPropertyAppraisers: any = {};
            let foundSearch: any;
            if(source == 'property'){
                foundSearch = await searchAddress(page, opp.propertyId['County'], opp.propertyId["Property Address"]);
            } else {
                foundSearch = await searchName(page, opp.ownerId['County'], normalizeNameForSearch(opp.ownerId['Full Name']));
            }
            if(!foundSearch){
                console.log("Not found!");
                await page.close();
                return false;
            }
            const [clickViewResult] = await page.$x('//button[contains(text(),"View Results")]');
            await clickViewResult.click();
            let data: any;
            if(source == 'property'){
                data = await getJsonDataAfterViewResult(page, opp.propertyId["Property Address"]);
            } else {
                data = await getJsonDataAfterViewName(page);
            }
            if (!data) throw new Error();
            let result: any = {};
            if(source == 'property'){
                result = await parseJsonData(data, opp.propertyId['County']);
            } else {
                result = await parseJsonData(data, opp.ownerId['County']);
            }
            if(result['owner_names']){
                const owner_name = result['owner_names'][0];
                dataFromPropertyAppraisers['Full Name'] = owner_name['fullName'];
                dataFromPropertyAppraisers['First Name'] = owner_name['firstName'];
                dataFromPropertyAppraisers['Last Name'] = owner_name['lastName'];
                dataFromPropertyAppraisers['Middle Name'] = owner_name['middleName'];
                dataFromPropertyAppraisers['Name Suffix'] = owner_name['suffix'];
                dataFromPropertyAppraisers['Owner Occupied'] = result['Owner Occupied'];
                dataFromPropertyAppraisers['Mailing Care of Name'] = '';
                dataFromPropertyAppraisers['Mailing Address'] = result['Mailing Address'];
                dataFromPropertyAppraisers['Mailing City'] = result['Mailing City'];
                dataFromPropertyAppraisers['Mailing State'] = result['Mailing State'];
                dataFromPropertyAppraisers['Mailing Zip'] = result['Mailing Zip'];
                dataFromPropertyAppraisers['Mailing Unit #'] = '';
                dataFromPropertyAppraisers['Property Type'] = result['Property Type'];
                dataFromPropertyAppraisers['Property Address'] = result['Property Address'];
                dataFromPropertyAppraisers['Property Unit #'] = result['Property Unit #'];
                dataFromPropertyAppraisers['Property City'] = result['Property City'];
                dataFromPropertyAppraisers['Property State'] = result['Property State'];
                dataFromPropertyAppraisers['Property Zip'] = result['Property Zip'];
                dataFromPropertyAppraisers['County'] = result['County'];
                dataFromPropertyAppraisers['Est Equity'] = '';
                dataFromPropertyAppraisers['Total Assessed Value'] = result['Total Assessed Value'];
                dataFromPropertyAppraisers['Last Sale Recording Date'] = result['Last Sale Recoding Date'];
                dataFromPropertyAppraisers['Last Sale Amount'] = result['Last Sale Amount'];
                dataFromPropertyAppraisers['Est. Remaining balance of Open Loans'] = '';
                dataFromPropertyAppraisers['Est Value'] = result['Est. Value'];
                dataFromPropertyAppraisers['Effective Year Built'] = result['Effective Year Built'];
                try{
                    await saveToNewSchema(dataFromPropertyAppraisers, source, opp._id);
                } catch {
                    // pass it
                }
            }
            await page.close();
            return true;
        } catch (e) {
            console.log(e);
            await page.close();
            return false;
        }
        
    };

    function normalizeNameForSearch(name: string){
        return name.replace(",","").toUpperCase().trim();
    }

    function getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min) ) + min;
    }

    try{
        let browser = await launchBrowser();

        //@ts-ignore
        const cursor = db.models.OwnerProductProperty.find({ propertyAppraiserProcessed: { $ne: true }}).populate('ownerId propertyId').cursor({batchSize: 20}).addCursorFlag('noCursorTimeout',true);
        for (let opp = await cursor.next(); opp != null; opp = await cursor.next()) {
            if(countLimit > limit){
                console.log("Limit is reached. Breaking the loop...");
                break;
            }
            if((opp.propertyId && !opp.ownerId) || (opp.propertyId && opp.ownerId)) {
                if(opp.propertyId['Property State'] != 'CA'){
                    continue;
                }
                console.log("Currently processing:");
                console.log(opp);
                let result = await startParsing(browser, opp, 'property');
                if(!result){
                    opp.propertyAppraiserProcessed = true;
                    opp.save();
                }

            } else if(!opp.propertyId && opp.ownerId) {
                if(opp.ownerId['Property State'] != 'CA'){
                    continue;
                }
                console.log("Currently processing:");
                console.log(opp);
                let result = await startParsing(browser, opp, 'name');
                if(!result){
                    opp.propertyAppraiserProcessed = true;
                    opp.save();
                }
            } else {
                continue;
            }

            countLimit++;
            let randInt = getRandomInt(180000,300000);
            console.log("Sleeping with", randInt, "ms...");
            await sleep(randInt);
        };

        await browser.close();
        process.exit();
    } catch(e){
        console.log(e);
        process.exit();
    }
})();