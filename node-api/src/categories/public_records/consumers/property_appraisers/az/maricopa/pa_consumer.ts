import puppeteer from 'puppeteer';
import AbstractPAConsumer from '../../abstract_pa_consumer_updated';
import { IPublicRecordAttributes } from '../../../../../../models/public_record_attributes'
const parser = require('parse-address');
const {parseFullName} = require('parse-full-name');

import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';
import { IOwnerProductProperty } from '../../../../../../models/owner_product_property';
import { IProperty } from '../../../../../../models/property';

export default class PAConsumer extends AbstractPAConsumer {
    publicRecordProducer: IPublicRecordProducer;
    ownerProductProperties: IOwnerProductProperty[];

    urls = {
        propertyAppraiserPage: 'https://mcassessor.maricopa.gov/'
    }

    xpaths = {
        isPAloaded: '//input[@id="searchBar"]'
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
        this.browserPages.propertyAppraiserPage.setDefaultTimeout(200000);
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

    /**
     * convert address to required infos
     * @param document : IPublicRecordAttributes 
     *  full_address:  1527 N 23rd St, Lincoln, NE 68503
        street_name:   23rd St
        street_full:   1527 N 23rd St
        parsed
            number:     1527
            prefix:     N
            street:     23rd
            type:     St
            city:       Lincoln
            state:      NE
            zip:        68503
     */
    getAddress(document: IProperty): any {
      // 'Property Address': '162 DOUGLAS HILL RD',
      // 'Property City': 'WEST BALDWIN',
      // County: 'Cumberland',
      // 'Property State': 'ME',
      // 'Property Zip': '04091',
      const full_address = `${document['Property Address']}, ${document['Property City']}, ${document['Property State']} ${document['Property Zip']}`
      const parsed = parser.parseLocation(document['Property Address']);
      
      let street_name = parsed.street.trim();
      let street_full = document['Property Address'];
      let street_with_type = (parsed.number ? parsed.number : '') + ' ' + (parsed.prefix ? parsed.prefix : '') + ' ' + parsed.street + ' ' + (parsed.type ? parsed.type : '');
      street_with_type = street_with_type.trim();

      return {
        full_address,
        street_name,
        street_with_type,
        street_full,
        parsed
      }
    }

    /**
     * check if element exists
     * @param page 
     * @param selector 
     */
    async checkExistElement(page: puppeteer.Page, selector: string): Promise<Boolean> {
      const exist = await page.$(selector).then(res => res !== null);
      return exist;
    }

    /**
     * get textcontent from specified element
     * @param page 
     * @param root 
     * @param selector 
     */
    async getElementTextContent(page: puppeteer.Page, selector: string): Promise<string> {
      try {
        const existSel = await this.checkExistElement(page, selector);
        if (!existSel) return '';
        let content = await page.$eval(selector, el => el.textContent)
        return content ? content.trim() : '';
      } catch (error) {
        console.log(error)
        return '';
      }
    }
    /**
     * get innerHTML from specified element
     * @param page 
     * @param root 
     * @param selector 
     */
    async getElementHtmlContent(page: puppeteer.Page, selector: string): Promise<string> {
      try {
        const existSel = await this.checkExistElement(page, selector);
        if (!existSel) return '';
        const content = await page.$eval(selector, el => el.innerHTML)
        return content ? content : '';
      } catch (error) {
        console.log(error)
        return '';
      }
    }

    async getTextByXpathFromPage(page: puppeteer.Page, xPath: string): Promise<string> {
      const [elm] = await page.$x(xPath);
      if (elm == null) {
          return '';
      }
      let text = await page.evaluate(j => j.innerText, elm);
      return text.replace(/\n/g, ' ');
    }

    /**
     * analysis name
     * @param name 
     */
    discriminateAndRemove(name: string) : any {
      const companyIdentifiersArray = [ 'GENERAL', 'TRUSTEE', 'TRUSTEES', 'INC', 'ORGANIZATION', 'CORP', 'CORPORATION', 'LLC', 'MOTORS', 'BANK', 'UNITED', 'CO', 'COMPANY', 'FEDERAL', 'MUTUAL', 'ASSOC', 'AGENCY' , 'OF' , 'SECRETARY' , 'DEVELOPMENT' , 'INVESTMENTS', 'HOLDINGS', 'ESTATE', 'LLP', 'LP', 'TRUST', 'LOAN', 'CONDOMINIUM', 'CHURCH', 'CITY', 'CATHOLIC', 'D/B/A', 'COCA COLA', 'LTD', 'CLINIC', 'TODAY', 'PAY', 'CLEANING', 'COSMETIC', 'CLEANERS', 'FURNITURE', 'DECOR', 'FRIDAY HOMES', 'SAVINGS', 'PROPERTY', 'PROTECTION', 'ASSET', 'SERVICES', 'L L C', 'NATIONAL', 'ASSOCIATION', 'MANAGEMENT', 'PARAGON', 'MORTGAGE', 'CHOICE', 'PROPERTIES', 'J T C', 'RESIDENTIAL', 'OPPORTUNITIES', 'FUND', 'LEGACY', 'SERIES', 'HOMES', 'LOAN'];
      const removeFromNamesArray = ['ET', 'AS', 'DECEASED', 'DCSD', 'CP\/RS', 'JT\/RS', 'esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.', '&'];
      const companyRegexString = `\\b(?:${companyIdentifiersArray.join('|')})\\b`;
      const removeFromNameRegexString = `^(.*?)\\b(?:${removeFromNamesArray.join('|')})\\b.*?$`;
      const companyRegex = new RegExp(companyRegexString, 'i');
      const removeFromNamesRegex = new RegExp(removeFromNameRegexString, 'i');
      let isCompanyName = name.match(companyRegex);
      if (isCompanyName) {
          return {
              type: 'company',
              name: name
          }
      }
      
      let cleanName = name.match(removeFromNamesRegex);
      if (cleanName) {
          name = cleanName[1];
      }
      return {
          type: 'person',
          name: name
      }
    }

    /**
     * Parse owner names
     * @param name_str : string
     * @param address : string
     */
    parseOwnerName(name_str: string): any[] {
      const result: any = {};

      // owner name
      let owner_full_name = name_str;
      let owner_first_name = '';
      let owner_last_name = '';
      let owner_middle_name = '';

      const owner_class_name = this.discriminateAndRemove(owner_full_name);
      if (owner_class_name.type === 'person') {
        const owner_temp_name = parseFullName(owner_class_name.name);
        owner_first_name = owner_temp_name.first ? owner_temp_name.first : '';
        owner_last_name = owner_temp_name.last ? owner_temp_name.last : '';
        owner_middle_name = owner_temp_name.middle ? owner_temp_name.middle : '';
      }

      result['full_name'] = owner_full_name;
      result['first_name'] = owner_first_name;
      result['last_name'] = owner_last_name;
      result['middle_name'] = owner_middle_name;
      result['suffix'] = this.getSuffix(owner_full_name);
      return result;
    }

    getSuffix(name: string) : any {
      const suffixList = ['esq','esquire','jr','jnr','sr','snr','2','ii','iii','iv','md','phd','j.d.','ll.m.','m.d.','d.o.','d.c.','p.c.','ph.d.'];
      name = name.toLowerCase();
      for(let suffix of suffixList){
          let regex = new RegExp(' '+suffix, 'gm');
          if (name.match(regex)){
              return suffix;
          }
      }
      return '';
    }
    /**
     * Remove spaces, new lines
     * @param text : string
     */
    simplifyString(text: string): string {
      return text.replace(/( +)|(\n)/gs, ' ').trim();
    }

    /**
     * Compare 2 addresses
     * @param address1 
     * @param address2 
     */
    compareAddress(address1: any, address2: any): Boolean {
      const address1_number = address1.number===undefined ? '' : address1.number.trim().toUpperCase();
      const address2_number = address2 ? (address2.number===undefined ? '' : address2.number.trim().toUpperCase()) : '';
      const address1_prefix = address1 && address1.prefix===undefined ? '' : address1.prefix.trim().toUpperCase();
      const address2_prefix = address2 ? (address2.prefix===undefined ? '' : address2.prefix.trim().toUpperCase()) : '';
      const address1_type = address1.type===undefined ? '' : address1.type.trim().toUpperCase();
      const address2_type = address2 ? (address2.type===undefined ? '' : address2.type.trim().toUpperCase()) : '';
      const address1_street = address1.street===undefined ? '' : address1.street.trim().toUpperCase();
      const address2_street = address2 ? (address2.street===undefined ? '' : address2.street.trim().toUpperCase()) : '';

      return  (address1_number === address2_number) &&
              (address1_prefix === address2_prefix) &&
              (address1_type === address2_type) &&
              (address1_street === address2_street);
    }

    // the main parsing function. if read() succeeds, parseAndSave is started().
    // return true after all parsing is complete 

    // docsToParse is the collection of all address objects to parse from mongo.
    // !!! Only mutate document objects with the properties that need to be added!
    // if you need to multiply a document object (in case of multiple owners
    // or multiple properties (2-3, not 30) you can't filter down to one, use this.cloneMongoDocument(document);
    // once all properties from PA have been added to the document, call 
    // "document.propertyAppraiserProcessed = true" and "await document.save()" (make sure to only call save() once though).
    async parseAndSave(docsToParse: IOwnerProductProperty[]): Promise<boolean>   {
        console.log(`Documents to look up: ${docsToParse.length}.`);
        const page = this.browserPages.propertyAppraiserPage;
        if (page === undefined) return false;

        // get values of cities option
        const select_cities = await page.$x('//select[@name="district"]/option');
        const option_details = [];
        for (let option_city of select_cities) {
          const option_detail = await page.evaluate(el => ({value: el.value, city: el.textContent.trim().toUpperCase()}), option_city);
          option_details.push(option_detail);
        }
        for (let document of docsToParse) {
            if (!this.decideSearchByV2(document)) {
              // console.log('Insufficient info for Owner and Property');
              continue;
            }
            try {
              document.propertyAppraiserProcessed = true;
              await document.save();
            } catch(e){
              // console.log(e);
            }
            // do everything that needs to be done for each document here
            // parse address
            let address;
            let search_addr;
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
              try{
                address = this.getAddress(document.propertyId);
                if(address['parsed'] && address['parsed']['sec_unit_num']){
                  search_addr = address['street_with_type'] + ' #' + address['parsed']['sec_unit_num']
                } else {
                  search_addr = address['street_full'];
                }
              } catch(e){
                search_addr = document.propertyId['Property Address'];
              }
                console.log(`Looking for address: ${search_addr}`);
            }

            let retry_count = 0;
            while (true){
              if (retry_count > 15){
                  console.error('Connection/website error for 15 iteration.');
                  await this.browser?.close();
                  return false;
              }
              try {
                await page.goto(this.urls.propertyAppraiserPage, { waitUntil: 'load'});
              } catch (error) {
                await page.reload();
              }
              try {                
                await page.waitForSelector('input#searchBar');

                const inputHandle = await page.$('input#searchBar');
                if (inputHandle) {
                  await inputHandle.type(this.searchBy==='name' ? owner_name : search_addr, {delay: 150});
                  await Promise.all([
                    inputHandle.type(String.fromCharCode(13), {delay: 150}),
                    page.waitForNavigation()
                  ]);

                  const search_results = await page.$x('//table[@id="rp-table"]/tbody/tr');
                  if (search_results.length == 0){
                    console.log("Not found!");
                    break;
                  }

                  const rows = await page.$x('//table[@id="rp-table"]/tbody/tr');
                  const datalinks = [];
                  if (this.searchBy === 'name') {
                      for (const row of rows) {
                          const {name, link} = await page.evaluate(el => ({name: el.children[1].textContent.trim(), link: el.children[0].children[0].href}), row);
                          const regexp = new RegExp(owner_name_regexp);
                          if (!regexp.exec(name.toUpperCase())) continue;
                          datalinks.push(link);
                      }
                  }
                  else {
                      let link = await page.evaluate(el => el.children[0].children[0].href, rows[0]);
                      datalinks.push(link);
                  }

                  if (datalinks.length === 0) {
                      console.log("The search results is not reliable! (different from the keyword)");
                      break;
                  }

                  for (let datalink of datalinks) {
                    try{
                      console.log("Processing => ", datalink);
                      await page.goto(datalink, {waitUntil: 'load'});
                      let result = await this.getPropertyInfos(page, address);
                      await this.parseResult(result, document);
                    } catch (e){
                      // console.log(e);
                      console.log('Error during parse property (possibly property is N/A)');
                      continue;
                    }
                  }
                }
                break;                    
              } catch (error) {
                console.log(error);
                console.log('retrying... ', retry_count);
                retry_count++;
                await page.waitFor(1000);
              }    
            }
            await this.randomSleepIn5Sec();
        }
        return true;
    }

    async parseResult(result: any, document: any) {
      let dataFromPropertyAppraisers = {
          'Full Name': result['owner_names'][0]['full_name'],
          'First Name': result['owner_names'][0]['first_name'],
          'Last Name': result['owner_names'][0]['last_name'],
          'Middle Name': result['owner_names'][0]['middle_name'],
          'Name Suffix': result['owner_names'][0]['suffix'],
          'Mailing Care of Name': '',
          'Mailing Address': result['mailing_address'],
          'Mailing Unit #': '',
          'Mailing City': result['mailing_address_parsed'] ? result['mailing_address_parsed']['city'] : '',
          'Mailing State': result['mailing_address_parsed'] ? result['mailing_address_parsed']['state'] : '',
          'Mailing Zip': result['mailing_address_parsed'] ? result['mailing_address_parsed']['zip'] : '',
          'Property Address': result['property_address'],
          'Property Unit #': '',
          'Property City': result['property_address_parsed']['city'],
          'Property State': 'AZ',
          'Property Zip': result['property_address_parsed']['zip'],
          'County': 'Maricopa',
          'Owner Occupied': result['owner_occupied'],
          'Property Type': result['property_type'],
          'Total Assessed Value': result['total_assessed_value'],
          'Last Sale Recording Date': result['last_sale_recording_date'],
          'Last Sale Amount': result['last_sale_amount'],
          'Est. Remaining balance of Open Loans': '',
          'Est Value': result['est_value'],
          'Effective Year Built': '',
          'Est Equity': '',
          'Lien Amount': ''
      };
      try{
        await this.saveToOwnerProductPropertyV2(document, dataFromPropertyAppraisers);
      } catch(e){
        //
      }
      // for (let index = 0; index < result['owner_names'].length ; index++) {
      //   const owner_name = result['owner_names'][index];
      //   if (index == 0) {
      //     document['Full Name'] = owner_name['full_name'];
      //     document['First Name'] = owner_name['first_name'];
      //     document['Last Name'] = owner_name['last_name'];
      //     document['Middle Name'] = owner_name['middle_name'];
      //     document['Name Suffix'] = owner_name['suffix'];
      //     document['Owner Occupied'] = result['owner_occupied'];
      //     if (this.searchBy === 'name') {
      //       document['Property Address'] = result['property_address'];
      //       document['Property City'] = result['property_address_parsed']['city'];
      //       document['Property State'] = result['property_address_parsed']['state'];
      //       document['Property Zip'] = result['property_address_parsed']['zip'];
      //     }
      //     document['Mailing Care of Name'] = '';
      //     document['Mailing Address'] = result['mailing_address'];
      //     if (result['mailing_address_parsed']) {
      //       document['Mailing City'] = result['mailing_address_parsed']['city'];
      //       document['Mailing State'] = result['mailing_address_parsed']['state'];
      //       document['Mailing Zip'] = result['mailing_address_parsed']['zip'];
      //     }
      //     document['Mailing Unit #'] = '';
      //     document['Property Type'] = result['property_type'];
      //     document['Total Assessed Value'] = result['total_assessed_value'];
      //     document['Last Sale Recording Date'] = result['last_sale_recording_date'];
      //     document['Last Sale Amount'] = result['last_sale_amount'];
      //     document['Est. Remaining balance of Open Loans'] = '';
      //     document['Est Value'] = result['est_value'];
      //     document['Effective Year Built'] = '';
      //     document['Est Equity'] = '';
      //     document.propertyAppraiserProcessed = true;
      //     console.log(document);
      //     await document.save();
      //   }
      //   else {
      //     let newDocument = await this.cloneMongoDocument(document)
      //     newDocument['Full Name'] = owner_name['full_name'];
      //     newDocument['First Name'] = owner_name['first_name'];
      //     newDocument['Last Name'] = owner_name['last_name'];
      //     newDocument['Middle Name'] = owner_name['middle_name'];
      //     newDocument['Name Suffix'] = owner_name['suffix'];
      //     console.log(newDocument);
      //     await newDocument.save();
      //   }
      // }   
    }

    async getPropertyInfos(page: puppeteer.Page, address: any): Promise<any> {
      // name
      const full_name_xpath = '//*[text()="Owner Information"]/following-sibling::p[1]';
      const full_name = await this.getTextByXpathFromPage(page, full_name_xpath);
      const owner_names = [];
      const owner_name_arr = full_name.split('/').map(str => this.simplifyString(str));
      for (let owner_name_iter of owner_name_arr) {
        if (owner_name_iter === '') break;
        const ownerName = this.parseOwnerName(owner_name_iter);
        owner_names.push(ownerName);
      }

      // property address
      const property_address_xpath = '//*[text()="Property Information"]/following-sibling::p[1]';
      let property_address: any = await this.getTextByXpathFromPage(page, property_address_xpath);
      console.log('Property Address from web: ', property_address);
      let property_address_array = property_address.split(" ");
      property_address = property_address_array.slice(0, property_address_array.length - 2).join(' ');
      let property_address_parsed = parser.parseLocation(property_address);
      property_address = 
        ((property_address_parsed['number'] ? property_address_parsed['number'] + ' ' : '') +
        (property_address_parsed['prefix'] ? property_address_parsed['prefix'] + ' ' : '') +
        (property_address_parsed['street'] ? property_address_parsed['street'] + ' ' : '') +
        (property_address_parsed['type'] ? property_address_parsed['type'] : '')).trim();

      // mailing address
      const mailing_address_xpath = '//*[text()="Mailing Address"]/following-sibling::td';
      let mailing_address = await this.getTextByXpathFromPage(page, mailing_address_xpath);
      const is_valid_address = mailing_address.match(/[a-zA-Z]/g) !== null;
      mailing_address = is_valid_address ? mailing_address : address['full_address'];
      const mailing_address_parsed = parser.parseLocation(mailing_address);
      // owner occupied
      const owner_occupied = this.compareAddress(this.searchBy==='name' ? property_address_parsed : address['parsed'], mailing_address_parsed);
        
      // sales info
      const last_sale_recording_date_xpath = '//*[text()="Sale Date"]/following-sibling::td';
      const last_sale_amount_xpath = '//*[text()="Sale Price"]/following-sibling::td';
      const last_sale_recording_date = await this.getTextByXpathFromPage(page, last_sale_recording_date_xpath);
      const last_sale_amount = await this.getTextByXpathFromPage(page, last_sale_amount_xpath);

      // property type
      const property_type_xpath = '//*[text()="PU Description"]/following-sibling::td[1]';
      const property_type = await this.getTextByXpathFromPage(page, property_type_xpath);
      	
      // assessed value and est. value
      const total_assessed_value_xpath = '//*[text()="Assessed LPV"]/following-sibling::td[1]';
      const est_value_xpath = '//*[text()="Full Cash Value"]/following-sibling::td[1]';
      const total_assessed_value = await this.getTextByXpathFromPage(page, total_assessed_value_xpath);
      const est_value = await this.getTextByXpathFromPage(page, est_value_xpath);

      return {
        owner_names, 
        property_address,
        property_address_parsed,
        mailing_address,
        mailing_address_parsed, 
        owner_occupied,
        property_type, 
        total_assessed_value, 
        last_sale_recording_date, 
        last_sale_amount, 
        est_value
      }
    }
}