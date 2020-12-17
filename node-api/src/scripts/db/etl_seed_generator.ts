import sqlPool from '../../models/etl_db';

export default class EtlGenerator {
    async dropDatabase(dbName: string): Promise<void> {
    }

    async createSchema(): Promise<void>{
        await this.createLead();
        await this.createDeal();
        await this.createMasterQueries();
    }

    async createLead(): Promise<boolean> {
        console.log('creating leads');
        return new Promise((resolve, reject) => {
            sqlPool.query(`
                CREATE TABLE IF NOT EXISTS leads (
                    id NUMERIC(65,0) PRIMARY KEY,
                    Global_ID VARCHAR(255) UNIQUE,
                    zoho_etl_record_type VARCHAR(255),
                    Timestamp_Lead_Creation DATETIME
                );
            `, (e: any, res: any) => {
                if(e) console.log('createLead ERROR: ', e);
                return e ? resolve(false) : resolve(true);
            });
        });
    }

    async createDeal(): Promise<boolean> {
        console.log('creating deals');
        return new Promise((resolve, reject) => {
            sqlPool.query(`
            CREATE TABLE IF NOT EXISTS deals (
                id NUMERIC(65,0) PRIMARY KEY,
                Global_ID VARCHAR(255),
                zoho_etl_record_type VARCHAR(255),
                Timestamp_Lead_Creation DATETIME
            );
            `, (e: any, result: any) => {
                if(e) console.log('createDeal ERROR: ', e);
                return e ? resolve(false) : resolve(true);
            });
        });
    }

    async createMasterQueries(): Promise<boolean> {
        console.log('creating master_queries');

        return new Promise((resolve, reject) => {
            sqlPool.query(`
                CREATE TABLE IF NOT EXISTS master_queries(
                    id INT AUTO_INCREMENT,
                    record_id VARCHAR(255),
                    global_id VARCHAR(255),
                    record_type VARCHAR(255),
                    modified_time DATETIME,
                    lead_status TINYTEXT,
                    lead_timestamp_created DATETIME,
                    lead_full_name VARCHAR(255),
                    lead_first_name VARCHAR(255),
                    lead_last_name VARCHAR(255),
                    lead_phone VARCHAR(255),
                    lead_email VARCHAR(255),
                    lead_reason_for_selling VARCHAR(255),
                    property_address_1 VARCHAR(255),
                    property_address_2 VARCHAR(255),
                    property_city VARCHAR(255),
                    property_state VARCHAR(255),
                    property_zip_code VARCHAR(255),
                    property_self_estimated_value VARCHAR(255),
                    zillow_zestimate VARCHAR(255),
                    zillow_use_code VARCHAR(255),
                    zillow_year_built VARCHAR(255),
                    zillow_last_sold_price VARCHAR(255),
                    zillow_last_sold_date VARCHAR(255),
                    marketing_ho_transaction_id VARCHAR(255),
                    marketing_ho_conversion VARCHAR(255),
                    marketing_ho_pub_id VARCHAR(255),
                    marketing_lander_id VARCHAR(255),
                    marketing_ho_s1 VARCHAR(255),
                    marketing_ho_s2 VARCHAR(255),
                    marketing_ho_s3 VARCHAR(255),
                    marketing_ho_s4 VARCHAR(255),
                    marketing_ho_s5 VARCHAR(255),
                    contract_timestamp_created DATETIME,
                    contract_zohosign_document_id VARCHAR(255),
                    contract_contract_status VARCHAR(255),
                    contract_hsc_status VARCHAR(255),
                    contract_offer_amount VARCHAR(255),
                    contract_seller_count TINYINT,
                    contract_seller_one_status TINYTEXT,
                    contract_seller_two_status TINYTEXT,
                    Primary Key(id)
                );
            `, (e: any) => {
                if(e) console.log('createMasterQueries ERROR: ', e);
                return e ? resolve(false) : resolve(true);
            });
        });
    }

    async truncateMasterQueries(): Promise<boolean> {
        console.log('truncating master_queries');

        return new Promise((resolve, reject) => {
            sqlPool.query(`
                TRUNCATE master_queries;
            `, (e: any) => {
                if(e) console.log('truncateMasterQueries ERROR: ', e);
                return e ? resolve(false) : resolve(true);
            });
        });
    }

    async bulkInsertMasterQueries(): Promise<boolean> {
        console.log('bulk inserting into master_queries');
        
        return new Promise((resolve, reject) => {
            sqlPool.query(`    
                INSERT master_queries(

                record_id,
                global_id,
                record_type,
                modified_time,
                lead_status,
                lead_timestamp_created,
                lead_full_name,
                lead_first_name,
                lead_last_name,
                lead_phone,
                lead_email,
                lead_reason_for_selling,
                property_address_1,
                property_address_2,
                property_city,
                property_state,
                property_zip_code,
                property_self_estimated_value,
                zillow_zestimate,
                zillow_use_code,
                zillow_year_built,
                zillow_last_sold_price,
                zillow_last_sold_date,
                marketing_ho_transaction_id,
                marketing_ho_conversion,
                marketing_ho_pub_id,
                marketing_lander_id,
                marketing_ho_s1,
                marketing_ho_s2,
                marketing_ho_s3,
                marketing_ho_s4,
                marketing_ho_s5,
                contract_timestamp_created,
                contract_zohosign_document_id,
                contract_contract_status,
                contract_hsc_status,
                contract_offer_amount,
                contract_seller_count,
                contract_seller_one_status,
                contract_seller_two_status

                )
                SELECT

                deals.id AS record_id,
                deals.Global_ID AS global_id,
                "DEAL" AS record_type,
                deals.Modified_Time AS modified_time,
                deals.Stage AS lead_status,
                deals.Timestamp_Lead_Creation AS lead_timestamp_created,
                deals.Full_Name AS lead_full_name,
                deals.First_Name AS lead_first_name,
                deals.Last_Name AS lead_last_name,
                deals.Phone AS lead_phone,
                deals.Email AS lead_email,
                deals.Reason_for_Selling AS lead_reason_for_selling,
                deals.Address_1 AS property_address_1,
                deals.Address_2 AS property_address_2,
                deals.City AS property_city,
                deals.State AS property_state,
                deals.Zip_Code AS property_zip_code,
                deals.Self_Estimated_Value AS property_self_estimated_value,
                deals.Z_Zestimate AS zillow_zestimate,
                deals.Z_Use_Code AS zillow_use_code,
                deals.Z_Year_Built AS zillow_year_built,
                deals.Z_Last_Sold_Price AS zillow_last_sold_price,
                deals.Z_Last_Sold_Date AS zillow_last_sold_date,
                deals.HO_Transaction_ID AS marketing_ho_transaction_id,
                deals.HO_Conversion AS marketing_ho_conversion,
                deals.HO_Pub_ID AS marketing_ho_pub_id,
                deals.HO_Lander_ID AS marketing_lander_id,
                deals.HO_S1 AS marketing_ho_s1,
                deals.HO_S2 AS marketing_ho_s2,
                deals.HO_S3 AS marketing_ho_s3,
                deals.HO_S4 AS marketing_ho_s4,
                deals.HO_S5 AS marketing_ho_s5,
                deals.contract_timestamp_created AS contract_timestamp_created,
                deals.contract_zohosign_document_id AS contract_zohosign_document_id,
                deals.contract_contract_status AS contract_contract_status,
                deals.contract_hsc_status AS contract_hsc_status,
                deals.Contract_Offer_Amount AS contract_offer_amount,
                deals.contract_seller_count AS contract_seller_count,
                deals.contract_seller_one_status AS contract_seller_one_status,
                deals.contract_seller_two_status AS contract_seller_two_status

                FROM deals
                UNION ALL
                SELECT

                leads.id AS record_id,
                leads.Global_ID AS global_id,
                "LEAD" AS record_type,
                leads.Modified_Time AS modified_time,
                leads.Lead_Status AS lead_status,
                leads.Timestamp_Lead_Creation AS Created_Time,
                leads.Full_Name AS lead_full_name,
                leads.First_Name AS lead_first_name,
                leads.Last_Name AS lead_last_name,
                leads.Phone AS lead_phone,
                leads.Email AS lead_email,
                leads.Reason_for_Selling AS lead_reason_for_selling,
                leads.Address_1 AS property_address_1,
                leads.Address_2 AS property_address_2,
                leads.City AS property_city,
                leads.State1 AS property_state,
                leads.Zip_Code AS property_zip_code,
                leads.Self_Estimated_Value AS property_self_estimated_value,
                leads.Z_Zestimate AS zillow_zestimate,
                leads.Z_Use_Code AS zillow_use_code,
                leads.Z_Year_Built AS zillow_year_built,
                leads.Z_Last_Sold_Price AS zillow_last_sold_price,
                leads.Z_Last_Sold_Date AS zillow_last_sold_date,
                leads.HO_Transaction_ID AS marketing_ho_transaction_id,
                leads.HO_Conversion AS marketing_ho_conversion,
                leads.HO_Pub_ID AS marketing_ho_pub_id,
                leads.HO_Lander_ID AS marketing_lander_id,
                leads.HO_S1 AS marketing_ho_s1,
                leads.HO_S2 AS marketing_ho_s2,
                leads.HO_S3 AS marketing_ho_s3,
                leads.HO_S4 AS marketing_ho_s4,
                leads.HO_S5 AS marketing_ho_s5,
                leads.contract_timestamp_created AS contract_timestamp_created,
                leads.contract_zohosign_document_id AS contract_zohosign_document_id,
                leads.contract_contract_status AS contract_contract_status,
                leads.contract_hsc_status AS contract_hsc_status,
                leads.Contract_Offer_Amount AS contract_offer_amount,
                leads.contract_seller_count AS contract_seller_count,
                leads.contract_seller_one_status AS contract_seller_one_status,
                leads.contract_seller_two_status AS contract_seller_two_status

                FROM leads
                WHERE leads.Global_ID NOT IN
                    (SELECT Global_ID
                    FROM deals WHERE Global_ID IS NOT NULL);
            `, (e: any) => {
                if(e) console.log('bulkInsertMasterQueries ERROR: ', e);
                return e ? resolve(false) : resolve(true);
            }); 
        });
    }
}