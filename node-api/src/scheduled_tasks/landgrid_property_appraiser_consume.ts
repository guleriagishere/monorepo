// Landgrid API Example by ADDRESS: https://landgrid.com/api/v1/search.json?query=9808%20NW%2070th%20Court%2033321&context=us/florida/broward/tamarac&token=BbmQh1nSN9T-53kTx282KAdUzp3sFY2zzNpPQLRqxauVoZ2XkN7z2u3AGGmNYNEV

// Landgrid API Example by OWNER NAME: https://landgrid.com/api/v1/search.json?owner=Viglione,Daniel&context=us/florida/broward/tamarac&token=BbmQh1nSN9T-53kTx282KAdUzp3sFY2zzNpPQLRqxauVoZ2XkN7z2u3AGGmNYNEV


require('dotenv').config();
import axios from 'axios';
import LineItem from '../models/line_item';
import { IPublicRecordAttributes } from '../models/public_record_attributes';
import { sleep } from '../core/sleepable';
import db, { PublicRecordLineItem, PublicRecordOwner, PublicRecordOwnerProductProperty, PublicRecordProperty } from '../models/db';
import { IOwnerProductProperty } from '../models/owner_product_property';
import { IProperty } from '../models/property';
import { IPublicRecordProducer } from '../models/public_record_producer';
import { property } from 'lodash';
import AbstractProducer from '../categories/public_records/producers/abstract_producer';

interface INameResp {
    type: string;
    suffix?: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
}

( async () => {
    const states = [
        ['Arizona', 'AZ'],
        ['Alabama', 'AL'],
        ['Alaska', 'AK'],
        ['Arkansas', 'AR'],
        ['California', 'CA'],
        ['Colorado', 'CO'],
        ['Connecticut', 'CT'],
        ['Delaware', 'DE'],
        ['Florida', 'FL'],
        ['Georgia', 'GA'],
        ['Hawaii', 'HI'],
        ['Idaho', 'ID'],
        ['Illinois', 'IL'],
        ['Indiana', 'IN'],
        ['Iowa', 'IA'],
        ['Kansas', 'KS'],
        ['Kentucky', 'KY'],
        ['Louisiana', 'LA'],
        ['Maine', 'ME'],
        ['Maryland', 'MD'],
        ['Massachusetts', 'MA'],
        ['Michigan', 'MI'],
        ['Minnesota', 'MN'],
        ['Mississippi', 'MS'],
        ['Missouri', 'MO'],
        ['Montana', 'MT'],
        ['Nebraska', 'NE'],
        ['Nevada', 'NV'],
        ['New Hampshire', 'NH'],
        ['New Jersey', 'NJ'],
        ['New Mexico', 'NM'],
        ['New York', 'NY'],
        ['North Carolina', 'NC'],
        ['North Dakota', 'ND'],
        ['Ohio', 'OH'],
        ['Oklahoma', 'OK'],
        ['Oregon', 'OR'],
        ['Pennsylvania', 'PA'],
        ['Rhode Island', 'RI'],
        ['South Carolina', 'SC'],
        ['South Dakota', 'SD'],
        ['Tennessee', 'TN'],
        ['Texas', 'TX'],
        ['Utah', 'UT'],
        ['Vermont', 'VT'],
        ['Virginia', 'VA'],
        ['Washington', 'WA'],
        ['West Virginia', 'WV'],
        ['Wisconsin', 'WI'],
        ['Wyoming', 'WY'],
    ];

    const applyNameNormalization = (fullNameString: string): INameResp[] => {
        fullNameString = fullNameString.replace(/\(.*\)/g,'');
        let fullNames: string[] = [];
        let symbols = ['&', '/', '+', '*'];
        for (const symbol of symbols) {
            if (fullNameString.indexOf(symbol) > -1) {
                fullNames = fullNameString.split(symbol).filter(name => name.trim() !== '').map(name => name?.trim());
                break;
            }
        }
        if (fullNames.length === 0)
            fullNames = [fullNameString];

        const normalizedNames = [];
        let lastName = '';
        let index = 0;
        for (fullNameString of fullNames) {
            if (index > 0 && fullNameString.indexOf(lastName) === -1) {
                fullNameString = lastName + ' ' + fullNameString;
            }
            const companyIdentifiersArray = [ 'GENERAL', 'TRUSTEES',  'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENT' , 'ESTATE', 'LLP', 'LP', 'HOLDINGS' , 'LOAN' ,'CONDOMINIUM'];
            const suffixArray = ['II', 'III', 'IV', 'CPA', 'DDS', 'ESQ', 'JD', 'JR', 'LLD', 'MD', 'PHD', 'RET', 'RN', 'SR', 'DO'];
            const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'TR', 'TRUSTEE', 'TRUST', 'INT'];
            const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
            const companyRegex = new RegExp(companyRegexString, 'i');
            const removeFromNameRegexString = `^(.*?)\\b(?:${removeFromNamesArray.join('|')})\\b.*?$`;
            const removeFromNamesRegex = new RegExp(removeFromNameRegexString, 'i');
            const nameNormalize = `^([^\\s,]+)(?:\\s+|,\\s*)(?:(${suffixArray.join('|')})(?:\\s+|,\\s*))?([^\\s]+)`;
            const nameNormalizeRegex = new RegExp(nameNormalize, 'i');
            let cleanName = fullNameString.match(removeFromNamesRegex);
            if (cleanName) {
                fullNameString = cleanName[1];
            }
            fullNameString = fullNameString.replace(/[^A-Z\s\-]/ig, '').replace(/\s+/g, ' ').trim();
            let normalizedName = fullNameString.match(nameNormalizeRegex)
            let returnObj: INameResp = { type: '', fullName: fullNameString};
            returnObj['suffix'] = '';
            if(fullNameString.match(companyRegex) || !normalizedName) {
                normalizedNames.push({'type': 'company', fullName: fullNameString});
            } else {
                if (normalizedName[2]) {
                    returnObj['suffix'] = normalizedName[2]?.trim();
                }
                returnObj['firstName'] = normalizedName[3]?.trim();
                returnObj['lastName'] = lastName =normalizedName[1]?.trim();
                returnObj['type'] = 'person';
                normalizedNames.push(returnObj);
            }
            index++;
        }
        console.log(normalizedNames);
        return normalizedNames;
    }

    const queryLandgridApi = async (PublicRecordLineItem: any, searchBy: string): Promise<{ [key: string]: any }> => {
        if (searchBy === 'property')
            return await queryLandgridApiByAddress(PublicRecordLineItem);
        else if (searchBy === 'name') {
            const result1 = await queryLandgridApiByName(PublicRecordLineItem);
            const result2 = await queryLandgridApiByName(PublicRecordLineItem, false);
            if (result1.response)
                return result1;
            else if (result2.response) 
                return result2;
            else return result1;
        }
        else throw `expected a searchBy type, got ${searchBy}`;
    }

    const queryLandgridApiByAddress = async(publicRecordAttributes: any): Promise<{ [key: string]: any }> => {
        const baseUrl = 'https://landgrid.com/api/v1/search.json?query=';
        let addressQuery = `${publicRecordAttributes['Property Address']} ${publicRecordAttributes['Property Zip']}`.trim();
        
        const { normalizedStateString, normalizedCountyString, normalizedCityString } = normalizedAddressFormat(publicRecordAttributes);

        let context = `us/${normalizedStateString}/${normalizedCountyString}/${normalizedCityString}`;
        let apiToken = "BbmQh1nSN9T-53kTx282KAdUzp3sFY2zzNpPQLRqxauVoZ2XkN7z2u3AGGmNYNEV";

        let reqUrl = baseUrl + addressQuery + '&context=' + context + '&token=' + apiToken + '&strict=1';
        console.log(reqUrl);

        let response: any = { status: 200 };
        let error = '';
        try {
            response = await axios.get(reqUrl);
        } catch(e) {
            response.status = 403; 
            error = e;
            console.log('GET ERROR: ', e);
        };

        if (response.status != 200) {
            console.warn(`Expected response status 200, received ${response.status}!`)
            return {response: false, error: error};
        } else {
            const allProperties: any[] = response.data.results;
            let triangulatedResults: any[] = [];

            if(allProperties.length > 0 ) {
                triangulatedResults = triangulateProperties(allProperties, publicRecordAttributes, normalizedStateString, normalizedCountyString, normalizedCityString );
            }
    
            let resultObjs = [];
            let resultObj: any = {};
            for (let result of triangulatedResults) {
                console.log(`Address: ${result.fields.original_address} \n Owner: ${result.fields.owner}, County: ${result.fields.county}`);
    
                if (result.fields.owner) {   
                    // vacancy specific 
                    resultObj['yearbuilt'] = result.fields.yearbuilt;
                    resultObj['usps_vacancy'] = result.fields.usps_vacancy;
                    resultObj['usps_vacancy_date'] = result.fields.usps_vacancy_date;
                    resultObj['parcel'] = result.fields.parcel;
                    resultObj['descbldg'] = result.fields.descbldg;
                    
                    // property specific
                    resultObj['improvval'] = result.fields.improvval;
                    resultObj['landval'] = result.fields.landval;
                    resultObj['parval'] = result.fields.parval;
                    resultObj['ll_bldg_footprint_sqft'] = result.fields.ll_bldg_footprint_sqft;
                    resultObj['ll_bldg_count'] = result.fields.ll_bldg_count;
                    resultObj['legaldesc'] = result.fields.legaldesc;
                    resultObj['sqft'] = result.fields.sqft;
                    resultObj['ll_gisacre'] = result.fields.ll_gisacre;
                    resultObj['lbcs_activity_desc'] = result.fields.lbcs_activity_desc;
                    resultObj['lbcs_function_desc'] = result.fields.lbcs_function_desc;
                    resultObj['lbcs_function_desc'] = result.fields.lbcs_function_desc;
                    resultObj['livingarea'] = result.fields.livingarea;
                    resultObj['assessmentyear'] = result.fields.assessmentyear;
                    resultObj['assessmentyear'] = result.fields.assessmentyear;
                    resultObj['assedvalschool'] = result.fields.assedvalschool;
                    resultObj['assedvalnonschool'] = result.fields.assedvalnonschool;
                    resultObj['taxvalschool'] = result.fields.taxvalschool;
                    resultObj['taxvalnonschool'] = result.fields.taxvalnonschool;
                    resultObj['justvalhomestead'] = result.fields.justvalhomestead;

                    // VERY IMPORTANT FIELDS!
                    resultObj['saledate'] = result.fields.saledate;
                    resultObj['saleprice'] = result.fields.saleprice;

                    let normalizedNames = applyNameNormalization(result.fields.owner);
                    for (let normalizedName of normalizedNames) {
                        if (normalizedName.type == 'person') {
                            const obj = {
                                ...resultObj,
                                'owner_full_name': normalizedName.fullName,
                                'owner_first_name': normalizedName.firstName,
                                'owner_last_name': normalizedName.lastName,
                            };
                            if (normalizedName.suffix) {
                                obj['owner_suffix'] = normalizedName.suffix;
                            }
                            resultObjs.push(obj);
                        }
                    }
                    
                    break;
                }
            }
    
            if(resultObjs.length > 0) {
                console.log(resultObjs);
                return {response: resultObjs};
            } else return {response: false, error: 'No owner_full_name in the response'};
        }
    };

    const queryLandgridApiByName = async(publicRecordAttributes: any, nameorder=true): Promise<{ [key: string]: any }> => {
        const baseUrl = 'https://landgrid.com/api/v1/search.json?owner=';

        let nameQuery: string = '';   
        if (publicRecordAttributes['Full Name']) {
            if (nameorder) {
                if (publicRecordAttributes['Last Name']) 
                    nameQuery = publicRecordAttributes['Last Name'];
                if (publicRecordAttributes['First Name'])
                    nameQuery = (nameQuery ? nameQuery + ', ' : '' )+ publicRecordAttributes['First Name'];
            }
            else {
                if (publicRecordAttributes['First Name']) 
                    nameQuery = publicRecordAttributes['First Name'];
                if (publicRecordAttributes['Last Name'])
                    nameQuery = (nameQuery ? nameQuery + ', ' : '' )+ publicRecordAttributes['Last Name'];
            }
            if (nameQuery === '')
                nameQuery = publicRecordAttributes['Full Name'];
        }
        if(nameQuery === '') {
            return {error: "No nameQuery"};
        }

        const { normalizedStateString, 
        normalizedCountyString } = normalizedAddressFormat(publicRecordAttributes);
        const context = `us/${normalizedStateString}/${normalizedCountyString}`;

        let apiToken = "BbmQh1nSN9T-53kTx282KAdUzp3sFY2zzNpPQLRqxauVoZ2XkN7z2u3AGGmNYNEV";

        let reqUrl = baseUrl + nameQuery + '&context=' + context + '&token=' + apiToken + '&strict=1';
        console.log('reqUrl: ', reqUrl);

        let response: any = { status: 200 };
        let error = '';
        try {
            response = await axios.get(reqUrl);
        } catch(e) {
            response.status = 403; 
            error = e;
            console.log('GET ERROR: ', e);
        };

        if (response.status != 200) {
            console.warn(`Expected response status 200, received ${response.status}!`)
            return {response: false, error: error};
        } else {
            const allProperties: any[] = response.data.results;
            let triangulatedResults: any[] = [];

            if(allProperties.length > 0 ) {
                triangulatedResults = triangulateProperties(allProperties, publicRecordAttributes, normalizedStateString, normalizedCountyString);

            }

            console.log('the triangulatedResults: ',triangulatedResults.length );

            let resultObj: any = {};
            for (let result of triangulatedResults) {
                console.log(`Address: ${result.fields.original_address} \n Owner: ${result.fields.owner}, County: ${result.fields.county}`);
    
                if (result.fields.owner) {
                    resultObj['owner_full_name'] = result.fields.owner;
    
                    // address specific
                    resultObj['Property Address'] = result.fields.mailadd;
                    resultObj['Property City'] = result.fields.mail_city;
                    resultObj['Property State'] = result.fields.mail_state2 || publicRecordAttributes['Property State'];

                    // Normalize the state, e.g if we got "FLORIDA" instead "FL"
                    if(resultObj['Property State'] && resultObj['Property State'].length > 2){
                        let resultState = '';
                        let stateArr = resultObj['Property State'].split(/\s+/g);
                        for (let word of stateArr){
                            word = word.toLowerCase();
                            word = word[0].toUpperCase() + word.substring(1);
                            resultState +=  word + ' ';
                        }
                        for(let i = 0; i < states.length; i++){
                            if(states[i][0] == resultState.trim()){
                                resultObj['Property State'] = states[i][1];
                                break;
                            }
                        }
                    }

                    resultObj['Property Zip'] = result.fields.mail_zip;          
                        
                    // vacancy specific 
                    resultObj['yearbuilt'] = result.fields.yearbuilt;
                    resultObj['usps_vacancy'] = result.fields.usps_vacancy;
                    resultObj['usps_vacancy_date'] = result.fields.usps_vacancy_date;
                    resultObj['parcel'] = result.fields.parcel;
                    resultObj['descbldg'] = result.fields.descbldg;
                    
                    // property specific
                    resultObj['improvval'] = result.fields.improvval;
                    resultObj['landval'] = result.fields.landval;
                    resultObj['parval'] = result.fields.parval;
                    resultObj['ll_bldg_footprint_sqft'] = result.fields.ll_bldg_footprint_sqft;
                    resultObj['ll_bldg_count'] = result.fields.ll_bldg_count;
                    resultObj['legaldesc'] = result.fields.legaldesc;
                    resultObj['sqft'] = result.fields.sqft;
                    resultObj['ll_gisacre'] = result.fields.ll_gisacre;
                    resultObj['lbcs_activity_desc'] = result.fields.lbcs_activity_desc;
                    resultObj['lbcs_function_desc'] = result.fields.lbcs_function_desc;
                    resultObj['lbcs_function_desc'] = result.fields.lbcs_function_desc;
                    resultObj['livingarea'] = result.fields.livingarea;
                    resultObj['assessmentyear'] = result.fields.assessmentyear;
                    resultObj['assessmentyear'] = result.fields.assessmentyear;
                    resultObj['assedvalschool'] = result.fields.assedvalschool;
                    resultObj['assedvalnonschool'] = result.fields.assedvalnonschool;
                    resultObj['taxvalschool'] = result.fields.taxvalschool;
                    resultObj['taxvalnonschool'] = result.fields.taxvalnonschool;
                    resultObj['justvalhomestead'] = result.fields.justvalhomestead;

                    // VERY IMPORTANT FIELDS!
                    resultObj['saledate'] = result.fields.saledate;
                    resultObj['saleprice'] = result.fields.saleprice;
                    
                    break;
                }
            }
    
            if(resultObj.hasOwnProperty('owner_full_name')) {
                console.log(resultObj);
                return {response: resultObj};
            } else return {response: false, error: 'No owner_full_name in the response'};
        }
    };

    const triangulateProperties = (allProperties: any[], publicRecordAttributes: any, normalizedStateString: string, normalizedCountyString: string, normalizedCityString: string | undefined = ''): any[] => {
        console.log(allProperties.length + ' results found. Triangulating.');
    
        let found = 0;
        let triangulatedResults = [];

        for (let property of allProperties) {
            let resultAddress = property.properties.headline;
            let resultPath = property.properties.path;

            const normalizeString = (str: string) => {
                return str && str.toLowerCase().replace(/[^A-Z\d\s]/ig, '')
            }

            if (publicRecordAttributes['Property Address'] && 
                normalizeString(resultAddress).includes(normalizeString(publicRecordAttributes['Property Address'])) && 
                normalizeString(resultPath).includes(normalizeString(normalizedStateString)) &&
                normalizeString(resultAddress).includes(normalizeString(normalizedCountyString)) && 
                normalizedCityString && normalizeString(resultAddress).includes(normalizeString(normalizedCityString))) {
                    found++;
                    triangulatedResults.push(property.properties);
            } else {
                if(found) {
                    // break out of the loop if we have already found matching results, as results are ordered by accuracy
                    break;
                } else {
                    if (normalizeString(resultPath).includes(normalizeString(normalizedStateString)) && 
                    normalizeString(resultPath).includes(normalizeString(normalizedCountyString)) && 
                    publicRecordAttributes['Property Address']) {
                        let streetPartIgnoreArray = ["road", "rd", "street", "st", "boulevard", "blvd", "blv", "bld", "circle", "cir", "avenue", "ave", "avn", "court", "ct", "cove", "cv", "creek", "crk", "estate", "est", "estates", "ests", "grove", "grv", "grov", "harbor", "harb", "harbr", "hrbor", "hbr", "heights", "hts", "hills", "hls", "hill", "hl", "manor", "mnr", "park", "prk", "parkway", "pky", "pkwy", "ranch", "rnch", "spring", "spng", "sprng", "spg", "springs", "spgs", "square", "sqr", "sqre", "squ", "sq", "terrace", "terr", "ter", "valley", "vally", "vlly", "vly", "valleys", "vlys", "vista", "vist", "vst", "vsta", "vis", "north", "south", "east", "west", "n", "s", "e", "w", "ne", "nw", "se", "sw"];

                        let notFound = false;
                        for(let addressPart of publicRecordAttributes['Property Address'].split(" ")) {
                            if (streetPartIgnoreArray.includes(normalizeString(addressPart))) {
                                continue;
                            }

                            if(!normalizeString(resultAddress).includes(normalizeString(addressPart))) {
                                notFound = true;
                                break;
                            }
                        }   
                        if (notFound) {
                            continue;
                        } else {
                            if (property.properties.fields.szip && property.properties.fields.szip.includes(publicRecordAttributes['Property Zip']))
                            triangulatedResults.push(property.properties);
                        }
                    }
                }
            }
        }

        // no triangulated results because no property address
        // this will most likely happen when all we have is an owner
        if(triangulatedResults.length === 0) {
            allProperties.forEach( (property: { [key: string]: any }) => {
                if(property.properties.fields.county && 
                    property.properties.fields.county.toLowerCase().replace(' ','-') === publicRecordAttributes['County'].toLowerCase().replace(' ','-') && 
                    property.properties.fields.state2 && 
                    property.properties.fields.state2.toLowerCase() === publicRecordAttributes['Property State'].toLowerCase()){
                    triangulatedResults.push(property.properties);
                }
            });
        }

        return triangulatedResults;
    }

    const normalizedAddressFormat = (publicRecordAttributes: any) => {
        let normalizedStateString = publicRecordAttributes['Property State'].toLowerCase();
        let normalizedCountyString = publicRecordAttributes['County'].toLowerCase().replace(/[^A-Z\s\d]/ig, '').replace(/\s+/g, '-');

        let normalizedCityString: string = '';
        if(publicRecordAttributes['Property City']) {
            normalizedCityString = publicRecordAttributes['Property City'].toLowerCase().replace(/[^A-Z\s\d]/ig, '').replace(/\s+/g, '-');
        }

        return {
            normalizedStateString, 
            normalizedCountyString, 
            normalizedCityString
        };
    };
    
    const updateDocumentAddressAttributes = async (lineItem: any, nameData: any, source: string, oppId: string) => {
        lineItem['Property Address'] = nameData['Property Address'];
        lineItem['Property City'] = nameData['Property City'];
        lineItem['Property State'] = nameData['Property State'];
        lineItem['Property Zip'] = nameData['Property Zip'];

        await checkPropertyAppraiserDetails(lineItem, nameData, source, oppId);

    }

    const updateDocumentNameAttributes = async (lineItem: any, nameData: any, source: string, oppId: string) => {
        lineItem['First Name'] = nameData['owner_first_name'];
        lineItem['Last Name'] = nameData['owner_last_name'];
        lineItem['Name Suffix'] = nameData['owner_suffix'];
        lineItem['Full Name'] = nameData['owner_full_name'];
        
        await checkPropertyAppraiserDetails(lineItem, nameData, source, oppId);
    }

    const updateOnlyAddressAttributes = async (opp: any, data: any): Promise<void> => {
        console.log('updateOnlyAddressAttributes: ', opp.propertyId['_id']);
        const property: IProperty = await db.models.Property.findOne({ _id: opp.propertyId['_id']});
        fillProperty(property, data);
        await property.save();
    }

    const fillProperty = (property: IProperty, data: any) => {
        property['Owner Occupied'] = (data['Owner Occupied'] || false);
        property['Property Type'] = (data['Property Type'] || null);
        property['Total Assessed Value'] = (data['Total Assessed Value'] || null);
        property['Last Sale Recording Date'] = (data['Last Sale Recording Date'] || null);
        property['Last Sale Recording Date Formatted'] = !isNaN(Date.parse(data['saledate'])) ? new Date(Date.parse(data['saledate'])) : null;
        property['Last Sale Amount'] = (data['Last Sale Amount'] || null);
        property['Est Value'] = (data['Est Value'] || null);
        property['Est Equity'] = (data['Est Equity'] || null);
        property['Effective Year Built'] = (data['Effective Year Built'] || null);
        property['yearBuilt'] = (data['yearBuilt'] || null);
        property['vacancy'] = (data['vacancy'] || null);
        property['vacancyDate'] = (data['vacancyDate'] || null);
        property['parcel'] = (data['parcel'] || null);
        property['descbldg'] = (data['descbldg'] || null);
        property['listedPrice'] = (data['listedPrice'] || null);
        property['listedPriceType'] = (data['listedPriceType'] || null);
        property['improvval'] = (data['improvval'] || null);
        property['ll_bldg_footprint_sqft'] = (data['ll_bldg_footprint_sqft'] || null);
        property['ll_bldg_count'] = (data['ll_bldg_count'] || null);
        property['legaldesc'] = (data['legaldesc'] || null);
        property['sqft'] = (data['sqft'] || null);
        property['ll_gisacre'] = (data['ll_gisacre'] || null);
        property['lbcs_activity_desc'] = (data['lbcs_activity_desc'] || null);
        property['lbcs_function_desc'] = (data['lbcs_function_desc'] || null);
        property['livingarea'] = (data['livingarea'] || null);
        property['assessmentyear'] = (data['assessmentyear'] || null);
        property['assedvalschool'] = (data['assedvalschool'] || null);
        property['assedvalnonschool'] = (data['assedvalnonschool'] || null);
        property['taxvalschool'] = (data['taxvalschool'] || null);
        property['taxvalnonschool'] = (data['taxvalnonschool'] || null);
        property['justvalhomestead'] = (data['justvalhomestead'] || null);
        property['effyearbuilt'] = (data['effyearbuilt'] || null);
        property['practiceType'] = (data['practiceType'] || null);
        property['Toal Open Loans'] = (data['Toal Open Loans'] || null);
        property['Lien Amount'] = (data['Lien Amount'] || null);
        property['Est. Remaining balance of Open Loans'] = (data['Est. Remainin] = balance of Open Loans'] || null);
        property['Tax Lien Year'] = (data['Tax Lien Year'] || null);
        property['caseUniqueId'] = (data['caseUniqueId'] || null);
        property['Last Sale Recording Date'] = data['saledate'] || null;
        property['fillingDate'] = (data['fillingDate'] || '');
        return property;
    };

    const normalizeStringForMongo = (sourceString: string) => {
        return sourceString.toLocaleLowerCase().replace('_', '-').replace(/[^A-Z\d\s\-]/ig, '').replace(/\s+/g, '-');
    }

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
                    let property = await db.models.Property.findOne({ 'Property Address': data['Property Address'], 'Property State': data['Property State'], County: normalizeStringForMongo(data['County']) });
                    if(!property){
                        let dataForProperty = {
                            'Property Address': (data['Property Address'] || null),
                            'Property Unit #': (data['Property Unit #'] || null),
                            'Property City': (data['Property City'] || null),
                            'Property State': (data['Property State'] || null),
                            'Property Zip': (data['Property Zip'] || null),
                            'County': normalizeStringForMongo(data['County'] || ''),
                            'Owner Occupied': (data['Owner Occupied'] || false),
                            'Property Type': (data['Property Type'] || null),
                            'Total Assessed Value': (data['Total Assessed Value'] || null),
                            'Last Sale Recording Date': (data['Last Sale Recording Date'] || null),
                            'Last Sale Recording Date Formatted': !isNaN(Date.parse(data['Last Sale Recording Date Formatted'])) ? new Date(Date.parse(data['Last Sale Recording Date Formatted'])) : null,
                            'Last Sale Amount': (data['Last Sale Amount'] || null),
                            'Est Value': (data['Est Value'] || null),
                            'Est Equity': (data['Est Equity'] || null),
                            'Effective Year Built': (data['Effective Year Built'] || null),
                            'yearBuilt': (data['yearBuilt'] || null),
                            'vacancy': (data['vacancy'] || null),
                            'vacancyDate': (data['vacancyDate'] || null),
                            'parcel': (data['parcel'] || null),
                            'descbldg': (data['descbldg'] || null),
                            'listedPrice': (data['listedPrice'] || null),
                            'listedPriceType': (data['listedPriceType'] || null),
                            'improvval': (data['improvval'] || null),
                            'll_bldg_footprint_sqft': (data['ll_bldg_footprint_sqft'] || null),
                            'll_bldg_count': (data['ll_bldg_count'] || null),
                            'legaldesc': (data['legaldesc'] || null),
                            'sqft': (data['sqft'] || null),
                            'll_gisacre': (data['ll_gisacre'] || null),
                            'lbcs_activity_desc': (data['lbcs_activity_desc'] || null),
                            'lbcs_function_desc': (data['lbcs_function_desc'] || null),
                            'livingarea': (data['livingarea'] || null),
                            'assessmentyear': (data['assessmentyear'] || null),
                            'assedvalschool': (data['assedvalschool'] || null),
                            'assedvalnonschool': (data['assedvalnonschool'] || null),
                            'taxvalschool': (data['taxvalschool'] || null),
                            'taxvalnonschool': (data['taxvalnonschool'] || null),
                            'justvalhomestead': (data['justvalhomestead'] || null),
                            'effyearbuilt': (data['effyearbuilt'] || null),
                            'practiceType': (data['practiceType'] || null),
                            'Toal Open Loans': (data['Toal Open Loans'] || null),
                            'Lien Amount': (data['Lien Amount'] || null),
                            'Est. Remaining balance of Open Loans': (data['Est. Remaining balance of Open Loans'] || null),
                            'Tax Lien Year': (data['Tax Lien Year'] || null),
                            'caseUniqueId': (data['caseUniqueId'] || null),
                            fillingDate: (data['fillingDate'] || '')
                        }
                        property = new PublicRecordProperty(dataForProperty);
                        await property.save();
                        property_id = property._id;
                        console.log(`--- NEW PROPERTY ${property_id}`);
                    } else if(property) {
                        fillProperty(property, data);
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
                            'First Name': (data['First Name'] || ''),
                            'Last Name': (data['Last Name'] || ''),
                            'Middle Name': (data['Middle Name'] || ''),
                            'Name Suffix': (data['Name Suffix'] || ''),
                            'Mailing Care of Name': (data['Mailing Care of Name'] || ''),
                            'Mailing Address': (data['Mailing Address'] || null),
                            'Mailing Unit #': (data['Mailing Unit #'] || null),
                            'Mailing City': (data['Mailing City'] || null),
                            'Mailing State': (data['Mailing State'] || null),
                            'Mailing Zip': (data['Mailing Zip'] || null)
                        };
                        owner = new PublicRecordOwner(dataForOwner);
                        await owner.save();
                        owner_id = owner._id;
                        console.log(`--- NEW OWNER ${owner_id}`);
                    } else if(owner) {
                        owner['Mailing Care of Name'] = (data['Mailing Care of Name'] || '');
                        owner['Mailing Address'] = (data['Mailing Address'] || null);
                        owner['Mailing Unit #'] = (data['Mailing Unit #'] || null);
                        owner['Mailing City'] = (data['Mailing City'] || null);
                        owner['Mailing State'] = (data['Mailing State'] || null);
                        owner['Mailing Zip'] = (data['Mailing Zip'] || null);
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
                    temp.landgridPropertyAppraiserProcessed = true;
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
                                landgridPropertyAppraiserProcessed: true
                            }
                            ownerProductProperty = new PublicRecordOwnerProductProperty(dataForOwnerProductProperty);
                            await ownerProductProperty.save();
                            isNew = true;
                            console.log(`--- NEW OWNER_PRODUCT_PROPERTY id = ${ownerProductProperty._id}`);
                        }
                        else {
                            ownerProductProperty.propertyId = property_id;
                            ownerProductProperty.landgridPropertyAppraiserProcessed = true;
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
                                landgridPropertyAppraiserProcessed: true
                            }
                            ownerProductProperty = new PublicRecordOwnerProductProperty(dataForOwnerProductProperty);
                            await ownerProductProperty.save();
                            isNew = true;
                            console.log(`--- NEW OWNER_PRODUCT_PROPERTY id = ${ownerProductProperty._id}`);
                        }
                        else {
                            ownerProductProperty.ownerId = owner_id;
                            ownerProductProperty.landgridPropertyAppraiserProcessed = true;
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

    const checkPropertyAppraiserDetails = async (lineItem: any, nameData: any, source: string, oppId: string) => {
        lineItem['yearBuilt'] = nameData['yearbuilt'];
        lineItem['vacancy'] = nameData['usps_vacancy'];
        lineItem['vacancyDate'] = nameData['usps_vacancy_date'];
        lineItem['parcel'] = nameData['parcel'];    
        lineItem['descbldg'] = nameData['descbldg'];

        // Est Equity not provided by LandGrid API

        if(!lineItem['Property Type']) {
            lineItem['Property Type'] = nameData['lbcs_function_desc'];
        }

        if(!lineItem['Total Assessed Value']) {
            lineItem['Total Assessed Value'] = nameData['parval'];
        }

        if(!lineItem['Est Value']) {
            lineItem['Est Value'] = nameData['parval'];
        }

        if(!lineItem['Effective Year Built']) {
            lineItem['Effective Year Built'] = nameData['effyearbuilt'];
        }

        if(!lineItem['Last Sale Recording Date']) {
            lineItem['Last Sale Recording Date'] = nameData['saledate'];
        }
        
        if(!lineItem['Last Sale Amount']) {
            lineItem['Last Sale Amount'] = nameData['saleprice'];
        }

        // extra useful property fields
        lineItem['improvval'] = nameData['improvval'];
        lineItem['ll_bldg_footprint_sqft'] = nameData['ll_bldg_footprint_sqft'];
        lineItem['ll_bldg_count'] = nameData['ll_bldg_count'];
        lineItem['legaldesc'] = nameData['legaldesc'];
        lineItem['sqft'] = nameData['sqft'];
        lineItem['ll_gisacre'] = nameData['ll_gisacre'];
        lineItem['lbcs_activity_desc'] = nameData['lbcs_activity_desc'];
        lineItem['lbcs_function_desc'] = nameData['lbcs_function_desc'];
        lineItem['livingarea'] = nameData['livingarea'];
        lineItem['assessmentyear'] = nameData['assessmentyear'];
        lineItem['assedvalschool'] = nameData['assedvalschool'];
        lineItem['assedvalnonschool'] = nameData['assedvalnonschool'];
        lineItem['taxvalschool'] = nameData['taxvalschool'];
        lineItem['taxvalnonschool'] = nameData['taxvalnonschool'];
        lineItem['justvalhomestead'] = nameData['justvalhomestead'];
        lineItem['effyearbuilt'] = nameData['effyearbuilt'];

        await saveToNewSchema(lineItem, source, oppId);
    }

    const getLineItemObject = (document: any) => {
        const { _id, __v, createdAt, updatedAt, ..._document } = document.toJSON();
        let lineItem: any = {..._document['ownerId'], ..._document['propertyId'], productId: _document['productId']};
        if (lineItem.hasOwnProperty('_id'))
            delete lineItem['_id'];
        if (lineItem.hasOwnProperty('__v'))
            delete lineItem['__v'];
        if (lineItem.hasOwnProperty('createdAt'))
            delete lineItem['createdAt'];
        if (lineItem.hasOwnProperty('updatedAt'))
            delete lineItem['updatedAt'];
        return lineItem;
    }

    const data = await db.models.PublicRecordProducer.aggregate([
        { $match: { source: 'landgrid-property-appraiser-consumer', processed: false  } },
        { $lookup: { from: 'county_priorities', localField: 'countyPriorityId', foreignField: '_id', as: 'county_priorities' }},
        { $unwind: "$county_priorities" },
        { $sort: {'county_priorities.priority': 1}}
    ]).limit(1);
    
    console.log(data);
    if(data.length > 0) {
        // use findOneAndUpdate for atomic operation since multiple tasks run in parallel and we don't want to tasks pulling the same public record producer
        const publicRecordProducer: IPublicRecordProducer = await db.models.PublicRecordProducer.findOneAndUpdate({ _id: data[0]['_id'] }, { processed: true });      
        const state = publicRecordProducer.state.toLowerCase();
        const county = publicRecordProducer.county;        
        console.log(`landgrid-pa-consumer: now processing county ${county} in state ${state} at ${new Date()}`);
        let countConsumed = 0;

        const regex = `/${state}/${county}/((?!other).)*$`;
        const productIds = (await db.models.Product.find({ name: {$regex: new RegExp(regex, 'gm')} })).map( (doc: any) =>  doc._id );
        //@ts-ignore 
        const cursor = db.models.OwnerProductProperty.find({ landgridPropertyAppraiserProcessed: {$ne: true}, productId: {$in: productIds} }).populate('ownerId propertyId').cursor({batchSize: 20}).addCursorFlag('noCursorTimeout',true);
        
        for (let opp = await cursor.next(); opp != null; opp = await cursor.next()) {
            // i have validation to ensure either propertyId or ownerId is present, so theoretically this should never happen. However, we did manually remove documents that were junk, thus breaking certain associations
            if(!opp.propertyId && !opp.ownerId) {
                continue;
            }
            if(opp.propertyId && opp.propertyAppraiserProcessed && opp.propertyId['Last Sale Amount']){
                console.log("OPP already completed with PA Consumer:", opp);
                continue;
            }
            console.log('~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ~~ # ');
            console.log('currently processing document: ', opp);
            const oppId = opp._id;
            let doc = getLineItemObject(opp);
            let result: any;

            if(opp.propertyId && !opp.ownerId) {
                result = await queryLandgridApi(doc, 'property');
                const {response: landGridDatas} = result;    
                if(landGridDatas) {
                    for (const landGridData of landGridDatas) {
                        await updateDocumentNameAttributes(doc, landGridData, 'property', oppId);
                        countConsumed++;
                    }
                }
            } else if(!opp.propertyId && opp.ownerId) {
                result = await queryLandgridApi(doc, 'name');
                const {response: landGridData} = result;    
                if(landGridData) {
                    await updateDocumentAddressAttributes(doc, landGridData, 'name', oppId);
                    countConsumed++;
                }
            } else {
                result = await queryLandgridApi(doc, 'property');
                const {response: landGridDatas} = result; 
                if(landGridDatas) {
                    await updateOnlyAddressAttributes(opp, landGridDatas[0]);
                    countConsumed++;
                }
            }

            const {response: landGridData, error} = result;
            if(!landGridData){
                opp.landgridPropertyAppraiserProcessed = true;
                opp.reason_for_failed_pa = error;
                const saved = await opp.save();
                console.log('WARNING unprocessable entity: ', saved);
            }
            await sleep(1000);
        };
        await AbstractProducer.sendMessage(publicRecordProducer.county, publicRecordProducer.state, countConsumed, 'Landgrid Consume');
    }
    else {
        console.log('==============================');
        console.log('no remaining landgrid-property-appraiser-consumer');
    }    

    process.exit();
})();