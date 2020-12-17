import puppeteer from 'puppeteer';
import db from '../../../../../../models/db';
import AbstractProducer from '../../../code_violation2/abstract_producer';
import axios from 'axios';
import { countReset } from 'console';

export default class CivilProducer extends AbstractProducer {

    sources =
      [
        { url:'https://nsdonline.phoenix.gov/CodeEnforcement/Details?caseNum=', handler: this.handleSource1 },
        { url: 'https://eservices.scottsdaleaz.gov/maps/CodeEnf/Summary?id=', handler: this.handleSource2 }
      ];

    async init(): Promise<boolean> {
        console.log("running init")
        this.browser = await this.launchBrowser();
        this.browserPages.generalInfoPage = await this.browser.newPage();

        await this.setParamsForPage(this.browserPages.generalInfoPage);
        return true;
    };
    async read(): Promise<boolean> {
      return true;
    };

    async openPage(page: puppeteer.Page, link: string, xpath: string) {
        try {
            await page.goto(link, {waitUntil: 'load'});
            await page.$x(xpath);
            return true;
        } catch (error) {
            return false;
        }
    }

    async parseAndSave(): Promise<boolean> {
        let countRecords = 0;
        let page = this.browserPages.generalInfoPage;

        for (const source of this.sources) {
            if (!page) continue;
            countRecords += await source.handler.call(this, page, source.url);
        }

        await AbstractProducer.sendMessage(this.publicRecordProducer.state, this.publicRecordProducer.county ? this.publicRecordProducer.county : this.publicRecordProducer.city, countRecords, 'Code Violation');
        return true;
    }

    async handleSource1(page: puppeteer.Page, link: any) {
        console.log('============ Checking for ', link);
        let counts = 0;
        let id = 1;
        while (true) {
            // load page
            const _id = id.toString().padStart(5, '0');
            const isPageLoaded = await this.openPage(page, `${link}PEF2020-${_id}`, '//footer');
            if (!isPageLoaded) {
                console.log('Page loading is failed, trying next...');
                continue;
            }
            const [errorMessage] = await page.$x('//*[contains(text(), "Error.")]');
            if (errorMessage) {
                break;
            }
            if (await this.getData1(page, id))
                counts++;
            await this.sleep(this.getRandomInt(1000, 2000));
            id++;
        }
        return counts;
    }

    async getData1(page: puppeteer.Page, id: number) {
        let fillingdate = await this.getTextByXpathFromPage(page, '//*[text()="Case Opened:"]/ancestor::div[1]/following-sibling::div[1]/p');
        let property_addresss = await this.getTextByXpathFromPage(page, '//*[text()="Address:"]/ancestor::div[1]/following-sibling::div[1]/p');

        return await this.saveRecord({
            property_addresss,
            fillingdate,
            caseno: id
        });
    }

    async handleSource2(page: puppeteer.Page, link: string) {
        console.log('============ Checking for ', link);
        let counts = 0;
        let id = 1;
        while (true) {
            // load page
            const _id = id.toString().padStart(6, '0');
            const isPageLoaded = await this.openPage(page, link+_id, '//header');
            if (!isPageLoaded) {
                console.log('Page loading is failed, trying next...');
                continue;
            }
            const [hasdata] = await page.$x('//*[text()="Complaint Number:"]');
            if (hasdata) {
                if (await this.getData2(page, id))
                counts++;
            }
            await this.sleep(this.getRandomInt(1000, 2000));
            id++;
        }
        return counts;
    }

    async getData2(page: puppeteer.Page, id: number) {
        let fillingdate = await this.getTextByXpathFromPage(page, '//*[text()="Received Date:"]/following-sibling::span[1]');
        let property_addresss = await this.getTextByXpathFromPage(page, '//*[text()="Location:"]/following-sibling::span[1]');
        let casetype = await this.getTextByXpathFromPage(page, '//*[text()="Complaint Type:"]/following-sibling::span[1]');
        
        return await this.saveRecord({
            property_addresss,
            fillingdate,
            casetype,
            caseno: id
        });
    }

    async saveRecord(record: any) {
        const data = {
            'Property State': this.publicRecordProducer.state,
            'County': this.publicRecordProducer.county,
            'Property Address': record.property_addresss,
            "propertyAppraiserProcessed": false,
            "vacancyProcessed": false,
            "productId": this.productId,
            "caseUniqueId": record.caseno.toString(),
            fillingDate: record.fillingdate,
            originalDocType: record.casetype
        };
        return await this.civilAndLienSaveToNewSchema(data);
    }
}