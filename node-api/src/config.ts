require('dotenv').config({path:__dirname+'/./../.env'});
import { IConfig } from "./iconfig";

export const config: IConfig = {
    test: {
        database_uri: process.env.MONGODB_URI_TEST || '',
        puppeteer_headless: (process.env.PUPPETEER_HEADLESS === 'true' ? true : false),
        productConfig: {
            riverside_property_appraiser_email: process.env.RIVERSIDE_PROPERTY_APPRAISER_EMAIL,
            riverside_property_appraiser_password: process.env.RIVERSIDE_PROPERTY_APPRAISER_PASSWORD,
            foreclosurecom_user: process.env.FORECLOSURECOM_USER,
            foreclosurecom_pass: process.env.FORECLOSURECOM_PASS,
            landgrid_accounts: {
                landgrid_account_emails: process.env.LANDGRID_ACCOUNT_EMAILS || '',
                landgrid_account_passwords:
                process.env.LANDGRID_ACCOUNT_PASSWORDS || ''
            }
        },
        aws: {
            region: process.env.AWS_REGION || '',
            account_id: process.env.AWS_ACCOUNT_ID || '',
            sqs: {
                api_version: process.env.SQS_API_VERSION || '',
                queue_name: process.env.SQS_QUEUE_NAME || '',
                dead_letter_queue_name: process.env.SQS_DEAD_LETTER_QUEUE_NAME || ''
            },
            sns: {
                api_version: process.env.SNS_API_VERSION || '',
                product_topic_name: process.env.SNS_PRODUCT_TOPIC_NAME || '',
                civil_topic_name: process.env.SNS_CIVIL_TOPIC_NAME || '',
                publish_subscribers: process.env.SNS_PUBLISH_SUBSCRIBERS || '',
                civil_update_subscribers: process.env.SNS_CIVIL_UPDATE_SUBSCRIBERS || ''
            },
            s3: {
                api_version: process.env.S3_API_VERSION || '',
                app_bucket_name: process.env.S3_APP_BUCKET_NAME || '',
                scraper_bucket_name: process.env.S3_SCRAPER_BUCKET_NAME || '',
                error_screenshot_bucket_name: process.env.S3_ERROR_SCREENSHOT_BUCKET_NAME || ''
            }
        },
        etl_db: {
            host: process.env.ETL_HOST || '',
            database: 'homesalesclub_etl_test',
            user: process.env.ETL_USER || '',
            password: process.env.ETL_PASSWORD || ''
        }
    },
    production: {
        database_uri: process.env.MONGODB_URI || '',
        puppeteer_headless: (process.env.PUPPETEER_HEADLESS === 'true' ? true : false),
        productConfig: {
            riverside_property_appraiser_email: process.env.RIVERSIDE_PROPERTY_APPRAISER_EMAIL,
            riverside_property_appraiser_password: process.env.RIVERSIDE_PROPERTY_APPRAISER_PASSWORD,
            foreclosurecom_user: process.env.FORECLOSURECOM_USER,
            foreclosurecom_pass: process.env.FORECLOSURECOM_PASS,
            landgrid_accounts: {
                landgrid_account_emails: process.env.LANDGRID_ACCOUNT_EMAILS || '',
                landgrid_account_passwords:
                process.env.LANDGRID_ACCOUNT_PASSWORDS || ''
            }
        },
        aws: {
            region: process.env.AWS_REGION || '',
            account_id: process.env.AWS_ACCOUNT_ID || '',
            sqs: {
                api_version: process.env.SQS_API_VERSION || '',
                queue_name: process.env.SQS_QUEUE_NAME || '',
                dead_letter_queue_name: process.env.SQS_DEAD_LETTER_QUEUE_NAME || ''
            },
            sns: {
                api_version: process.env.SNS_API_VERSION || '',
                product_topic_name: process.env.SNS_PRODUCT_TOPIC_NAME || '',
                civil_topic_name: process.env.SNS_CIVIL_TOPIC_NAME || '',
                publish_subscribers: process.env.SNS_PUBLISH_SUBSCRIBERS || '',
                civil_update_subscribers: process.env.SNS_CIVIL_UPDATE_SUBSCRIBERS || ''
            },
            s3: {
                api_version: process.env.S3_API_VERSION || '',
                app_bucket_name: process.env.S3_APP_BUCKET_NAME || '',
                scraper_bucket_name: process.env.S3_SCRAPER_BUCKET_NAME || '',
                error_screenshot_bucket_name: process.env.S3_ERROR_SCREENSHOT_BUCKET_NAME || ''
            }
        },
        etl_db: {
            host: process.env.ETL_HOST || '',
            database: 'homesalesclub_etl',
            user: process.env.ETL_USER || '',
            password: process.env.ETL_PASSWORD || ''
        }
    }
}
