import puppeteer from 'puppeteer';
const axios = require("axios");
const parseAddress = require('parse-address');
const { parseFullName } = require('parse-full-name');
import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';
import { IOwnerProductProperty } from '../../../../../../models/owner_product_property';
import { IProperty } from '../../../../../../models/property';


export default class PAConsumer extends AbstractPAConsumer {
    publicRecordProducer: IPublicRecordProducer;
    ownerProductProperties: IOwnerProductProperty[];

    urls = {
        propertyAppraiserPage: 'https://www.miamidade.gov/pa/home.asp'
    }

    xpaths = {
        isPAloaded: '//*[@id="mainContainer"]'
    }

    constructor(publicRecordProducer: IPublicRecordProducer, ownerProductProperties: IOwnerProductProperty[]) {
        super();
        this.publicRecordProducer = publicRecordProducer;
        this.ownerProductProperties = ownerProductProperties;
    }

    readDocsToParse(): IOwnerProductProperty[] {
        return this.ownerProductProperties;
    }

    // use this to initialize the browser and go to a specific url.
    // setParamsForPage is needed (mainly for AWS), do not remove or modify it please.
    // return true when page is usable, false if an unexpected error is encountered.
    async init(): Promise<boolean> {
        this.browser = await this.launchBrowser();
        this.browserPages.propertyAppraiserPage = await this.browser.newPage();
        await this.setParamsForPage(this.browserPages.propertyAppraiserPage);
        try {
            await this.browserPages.propertyAppraiserPage.goto(this.urls.propertyAppraiserPage, { waitUntil: 'load' });
            return true;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    // use this as a middle layer between init() and parseAndSave().
    // this should check if the page is usable or if there was an error,
    // so use an xpath that is available when page is usable.
    // return true when it's usable, false if it errors out.
    async read(): Promise<boolean> {
        try {
            await this.browserPages.propertyAppraiserPage?.waitForXPath(this.xpaths.isPAloaded);
            return true;
        } catch (err) {
            console.warn('Problem loading property appraiser page.');
            return false;
        }
    }

    // the main parsing function. if read() succeeds, parseAndSave is started().
    // return true after all parsing is complete 

    // docsToParse is the collection of all address objects to parse from mongo.
    // !!! Only mutate document objects with the properties that need to be added!
    // if you need to multiply a document object (in case of multiple owners
    // or multiple properties (2-3, not 30) you can't filter down to one, use this.cloneMongoDocument(document);
    // once all properties from PA have been added to the document, call 
    // "document.propertyAppraiserProcessed = true" and "await document.save()" (make sure to only call save() once though).
    async parseAndSave(docsToParse: any[]): Promise<boolean> {
        console.log(`Documents to look up: ${docsToParse.length}.`);
        //-------------------name seperation stuff goes here-------------------//

        const companyIdentifiersArray = ['GENERAL', 'TRUSTEE', 'TRUSTEES', 'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY', 'PA', 'P A', '\\d\\d+', 'TR', 'S A', 'FIRM', 'PORTFOLIO', 'LEGAL'];
        const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'JTRS', 'TRS', 'C\/O', '\\(BEN\\)', 'EST OF'];
        const suffixNamesArray = ['I', 'II', 'III', 'IV', 'V', 'ESQ', 'JR', 'SR']

        const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
        const removeFromNameRegexString = `^(.*?)(?:\\b|\\s+)(?:${removeFromNamesArray.join('|')})(?:\\b(.*?))?$`;

        const discriminateAndRemove = (name: any) => {
            let isCompanyName = name.match(new RegExp(companyRegexString, 'i'));
            if (isCompanyName) {
                return {
                    type: 'company',
                    name: name
                }
            }

            let cleanName = name.match(new RegExp(removeFromNameRegexString, 'i'))
            if (cleanName) {
                if (cleanName[1].trim()) {
                    name = cleanName[1];
                }
                else if (cleanName[2].trim()) {
                    name = cleanName[2];
                }
            }
            return {
                type: 'person',
                name: name
            }
        }
        const normalizeNames = (fullName: any) => {
            const suffixRegexString = `(?:\\s+(?:${suffixNamesArray.join('|')})\\s*$)`;
            const normalizeNameRegexString = `^\\s*([^\\s]+)\\s+(?:(.*?)\\s+)?([^\\s]+)\\s*$`;
            const normalizeNameRegex = new RegExp(normalizeNameRegexString, 'i');
            const suffixRegex = new RegExp(suffixRegexString, 'i');

            let nameWithoutSuffix = fullName;
            let nameSuffix = '';
            let hasSuffix = fullName.match(suffixRegex);
            if (hasSuffix) {
                nameSuffix = hasSuffix[0].trim()
                nameWithoutSuffix = nameWithoutSuffix.replace(hasSuffix[0], '');
                console.log(nameWithoutSuffix);
            }

            let normalizedNameMatch = nameWithoutSuffix.match(normalizeNameRegex);
            if (normalizedNameMatch) {

                let firstName = normalizedNameMatch[1];
                let middleName = normalizedNameMatch[2] || '';
                let lastName = normalizedNameMatch[3];
                return {

                    fullName: fullName.trim(),
                    firstName: firstName.trim(),
                    middleName: middleName.trim(),
                    lastName: lastName.trim(),
                    nameSuffix: nameSuffix.trim()
                }
            }
            return {
                firstName: '',
                middleName: '',
                lastName: '',
                nameSuffix: '',
                fullName: fullName.trim()
            }
        }
        const checkForMultipleNamesAndNormalize = (name: any) => {
            let results = [];
            let lastNameBkup = '';

            let multipleNames = name.match(/^(.*?)\s*&[HW]?\s*(.*?)$/);
            while (multipleNames) {
                let secondName = '';
                if (multipleNames[1].trim()) {
                    let normalized = normalizeNames(multipleNames[1])
                    if (normalized.hasOwnProperty('lastName')) {
                        lastNameBkup = normalized.lastName;
                    } else if (lastNameBkup) {
                        normalized['lastName'] = lastNameBkup;
                    }
                    results.push(normalized);
                }

                if (multipleNames[2].trim()) secondName = multipleNames[2];
                multipleNames = secondName.match(/^(.*?)\s*&[HW]?\s*(.*?)$/);
                if (!multipleNames && secondName.trim()) {
                    let normalized = normalizeNames(secondName);
                    if (!normalized.hasOwnProperty('lastName') || !normalized.lastName && lastNameBkup) {
                        normalized['lastName'] = lastNameBkup;
                    }
                    results.push(normalized);
                }
            }

            if (results.length) {
                return results;
            }
            return [normalizeNames(name)];
        }

        //--------------------------name separation stuff ends here---------------------------------//




        for (let document of docsToParse) {
            // let docToSave: any = await this.getLineItemObject(document);
            if (!this.decideSearchByV2(document)) {
                console.log('Insufficient info for Owner and Property');
                continue;
            }
            try {
                document.propertyAppraiserProcessed = true;
                await document.save();
            } catch (e) {

            }
            // do everything that needs to be done for each document here
            let adressToLookFor = '';
            let adressToLookForSplited: any;
            let first_name = '';
            let last_name = '';
            let owner_name = '';
            let owner_name_regexp = '';

            if (this.searchBy === 'name') {
                const nameInfo = this.getNameInfo(document.ownerId);
                first_name = nameInfo.first_name;
                last_name = nameInfo.last_name;
                owner_name = nameInfo.owner_name;
                owner_name_regexp = nameInfo.owner_name_regexp;
                if (owner_name === '') continue;
                console.log(`Looking for owner: ${owner_name}`);
            }
            else {
                adressToLookFor = document.propertyId['Property Address'];
                adressToLookForSplited = adressToLookFor.split('#');
                if (!adressToLookForSplited[1]) {
                    adressToLookForSplited[1] = '';
                }
                console.log(`Looking for address: ${adressToLookFor}`);
            }
            // console.log('adressToLookForSplited', adressToLookForSplited);

            let apiUrl = "";
            let dataFromPropertyAppraisers: any = {};
            if (this.searchBy === 'name') {
                owner_name = owner_name.replace(/\s+/g, '+');
                apiUrl = `https://www.miamidade.gov/Apps/PA/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetOwners&clientAppName=PropertySearch&enPoint=&from=1&ownerName=${owner_name}&to=200`
            } else {
                adressToLookForSplited[0] = adressToLookForSplited[0].replace(/\s+/g, '+');
                apiUrl = `https://www.miamidade.gov/Apps/PA/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetAddress&clientAppName=PropertySearch&from=1&myAddress=${adressToLookForSplited[0]}&myUnit=${adressToLookForSplited[1].trim()}&to=200`;
            }
            // console.log("apiUrl:",apiUrl);
            await axios
                .get(apiUrl)
                .then(async (res1: any) => {
                    if (res1.status == 200) {
                        if (res1.data.Completed == false) {
                            console.log("error : " + res1.data.Message)
                        }
                        else {
                            console.log('ADDRESS FOUND');
                            let arrayOfResults = res1.data.MinimumPropertyInfos;
                            if (arrayOfResults.length < 4) {
                                for (let currentResultNumber = 0; currentResultNumber < arrayOfResults.length; currentResultNumber++) {
                                    let element = arrayOfResults[currentResultNumber];


                                    //name separation
                                    let discriminateResult = discriminateAndRemove(element.Owner1);
                                    if (discriminateResult.type == 'person') {
                                        let separatedNamesArray = checkForMultipleNamesAndNormalize(discriminateResult.name);
                                        for (let separatedNameObj of separatedNamesArray) {
                                            // returnObj.people.push(separatedNameObj);
                                            dataFromPropertyAppraisers["Full Name"] = separatedNameObj.fullName;
                                            dataFromPropertyAppraisers["First Name"] = separatedNameObj.firstName;
                                            dataFromPropertyAppraisers["Last Name"] = separatedNameObj.lastName;
                                            dataFromPropertyAppraisers["Middle Name"] = separatedNameObj.middleName;
                                            dataFromPropertyAppraisers["Name Suffix"] = separatedNameObj.nameSuffix;
                                        }
                                    } else {
                                        dataFromPropertyAppraisers["Full Name"] = element.Owner1;
                                    }
                                    //
                                    dataFromPropertyAppraisers["Property Address"] = element.SiteAddress;
                                    dataFromPropertyAppraisers["Property Unit #"] = element.SiteUnit;
                                    dataFromPropertyAppraisers["Property State"] = "FL";
                                    dataFromPropertyAppraisers["County"] = "Miami-Dade";
                                    let flio = await element.Strap.split('-').join('');
                                    await axios
                                        .get("https://www.miamidade.gov/Apps/PA/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber=" + flio)
                                        .then((res2: any) => {
                                            if (res2.status == 200) {
                                                res2 = res2.data;
                                                //assessement Info of last year => thats why AssessmentInfos[0]
                                                if (res2.Assessment && res2.Assessment.AssessmentInfos[0]) {
                                                    dataFromPropertyAppraisers["Total Assessed Value"] = res2.Assessment.AssessmentInfos[0].AssessedValue;
                                                }

                                                //mailling address
                                                if (res2.MailingAddress) {
                                                    dataFromPropertyAppraisers["Mailing Address"] = res2.MailingAddress.Address1;
                                                    dataFromPropertyAppraisers["Mailing City"] = res2.MailingAddress.City;
                                                    dataFromPropertyAppraisers["Mailing State"] = res2.MailingAddress.State;
                                                    dataFromPropertyAppraisers["Mailing Zip"] = res2.MailingAddress.ZipCode;
                                                }

                                                //sales Info
                                                if (res2.SalesInfos[0]) {
                                                    dataFromPropertyAppraisers["Last Sale Amount"] = res2.SalesInfos[0].SalePrice;
                                                    dataFromPropertyAppraisers["Last Sale Recording Date"] = res2.SalesInfos[0].DateOfSale;
                                                }


                                                //Property Type
                                                if (res2.PropertyInfo) {
                                                    dataFromPropertyAppraisers["Property Type"] = res2.PropertyInfo.DORDescription;
                                                }

                                            }

                                        }).catch((error: any) => {
                                            console.log(error)
                                        });

                                    //owner occupied
                                    let ownerOccupied;
                                    if (dataFromPropertyAppraisers["Mailing Address"] != "" && dataFromPropertyAppraisers["Property Address"]) {
                                        //clean up addresses from new lines then compare
                                        if (
                                            dataFromPropertyAppraisers["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "").includes(dataFromPropertyAppraisers["Property Address"].replace(/(\r\n|\n|\r)/gm, "")) ||
                                            dataFromPropertyAppraisers["Mailing Address"].replace(/(\r\n|\n|\r)/gm, "") == dataFromPropertyAppraisers["Property Address"].replace(/(\r\n|\n|\r)/gm, "") ||
                                            dataFromPropertyAppraisers["Property Address"].replace(/(\r\n|\n|\r)/gm, "").includes(dataFromPropertyAppraisers["Mailing Address"].replace(/(\r\n|\n|\r)/gm, ""))
                                        ) {
                                            ownerOccupied = true;
                                        } else {
                                            ownerOccupied = false;
                                        }
                                        dataFromPropertyAppraisers["Owner Occupied"] = ownerOccupied;
                                    }


                                    //mark the document as processed first to be cloned as processed
                                    const regexp = new RegExp(owner_name_regexp);
                                    if (regexp.exec(element.Owner1.toUpperCase())) {
                                        await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
                                        // console.log(element.Owner1);
                                        // console.log(docToSave)
                                        // await this.saveToLineItem(docToSave);
                                        // await this.saveToOwnerProductProperty(docToSave);
                                    }




                                    //add the second name if exists
                                    // if (element.Owner2 && element.Owner2.trim() != "" && regexp.exec(element.Owner2.toUpperCase())) {
                                    //     const newDoc1 = this.cloneDocument(docToSave);;
                                    //     //name separation
                                    //     let discriminateResult = discriminateAndRemove(element.Owner2);
                                    //     if (discriminateResult.type == 'person') {
                                    //         let separatedNamesArray = checkForMultipleNamesAndNormalize(discriminateResult.name);
                                    //         for (let separatedNameObj of separatedNamesArray) {
                                    //             newDoc1["Full Name"] = separatedNameObj.fullName;
                                    //             newDoc1["First Name"] = separatedNameObj.firstName;
                                    //             newDoc1["Last Name"] = separatedNameObj.lastName;
                                    //             newDoc1["Middle Name"] = separatedNameObj.middleName;
                                    //             newDoc1["Name Suffix"] = separatedNameObj.nameSuffix;
                                    //         }
                                    //     } else {
                                    //         newDoc1["Full Name"] = element.Owner1;
                                    //     }
                                    //     if (res1.MailingAddress && res1.MailingAddress.Address2)
                                    //         newDoc1["Mailing Address"] = res1.MailingAddress.Address2;
                                    //     console.log(element.Owner2);
                                    //     console.log(newDoc1)
                                    //     await this.saveToLineItem(newDoc1);
                                    //     await this.saveToOwnerProductProperty(newDoc1);
                                    // }






                                    // //add the third owner if exists 
                                    // if (element.Owner3 && element.Owner3.trim() != "" && regexp.exec(element.Owner3.toUpperCase())) {
                                    //     const newDoc2 = this.cloneDocument(docToSave);
                                    //     //name separation
                                    //     let discriminateResult = discriminateAndRemove(element.Owner3);
                                    //     if (discriminateResult.type == 'person') {
                                    //         let separatedNamesArray = checkForMultipleNamesAndNormalize(discriminateResult.name);
                                    //         for (let separatedNameObj of separatedNamesArray) {
                                    //             newDoc2["Full Name"] = separatedNameObj.fullName;
                                    //             newDoc2["First Name"] = separatedNameObj.firstName;
                                    //             newDoc2["Last Name"] = separatedNameObj.lastName;
                                    //             newDoc2["Middle Name"] = separatedNameObj.middleName;
                                    //             newDoc2["Name Suffix"] = separatedNameObj.nameSuffix || '';
                                    //         }
                                    //     } else {
                                    //         newDoc2["Full Name"] = element.Owner1;
                                    //     }


                                    //     if (res1.MailingAddress && res1.MailingAddress.Address3)
                                    //         newDoc2["Mailing Address"] = res1.MailingAddress.Address3;
                                    //     console.log(element.Owner3);
                                    //     console.log(newDoc2);
                                    //     await this.saveToLineItem(newDoc2);
                                    //     await this.saveToOwnerProductProperty(newDoc2);
                                    // }


                                }

                            }

                        }

                    }
                    else {
                        console.log('response status code : ' + res1.status)
                    }
                })
                .catch((error: any) => {
                    console.log(error);
                });
            await this.randomSleepIn5Sec();

        }
        return true;
    }

}