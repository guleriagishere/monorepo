import db from "../../models/db"
import { IOwnerProductProperty } from '../../models/owner_product_property';
import {verifyToken} from '../../services/jwt_service';

export default {
    Query: {
        async fetchOwnerProductProperties(parent: any, args: any): Promise<any> {
            const token = args['token'];    
            const validate: any = await verifyToken(token);

            if (validate['valid']) {
                const filters = args['filters'] ? JSON.parse(args['filters']) : []
                let filterProperty:any = []
                for (let i = 0; i < filters.length; i++) {
                    filterProperty.push({[filters[i][0]]:{$regex:filters[i][1]} })
                }
                const practiceType = args['practiceType'] ? args['practiceType'] : 'all';
                const perPage = args['perPage'] ? args['perPage'] : 20;
                const currentPage = args['currentPage'] ? args['currentPage'] : 0;
                const from = args['from'];
                const to = args['to'];
                const skipRecords = perPage * (currentPage);


                let condition = {
                    createdAt: {
                        $gte: new Date(new Date(from).setHours(0, 0, 0)),
                        $lt: new Date(new Date(to).setHours(23, 59, 59))
                    },
                    $and: [
                        // {
                        //     $or: [
                        //         {landgridPropertyAppraiserProcessed: true},
                        //         {propertyAppraiserProcessed: true}
                        //     ]
                        // },
                        { ownerId: {$ne: null} },
                        { propertyId: {$ne: null} },
                        ...filterProperty
                    ]
                };
                if (practiceType && practiceType !== 'all') {
                    let productIds = await db.models.Product.find({name: {$regex: new RegExp(practiceType, 'i')}}).exec();
                    productIds = productIds.map(product => product._id);
                    condition['$and'] = [...condition['$and'], { productId: {$in: productIds}}];
                }

                console.log('ensure performance index exists on condition: ', condition);
                const docs: IOwnerProductProperty[] = await db.models.OwnerProductProperty.find(condition)
                .populate('ownerId propertyId productId')
                .skip(skipRecords)
                .limit(perPage);


                const count: number = await db.models.OwnerProductProperty.find(condition).count();
                console.log('COUNT = ', count);
                const practiceTypes: any = {
                    'foreclosure': 'Foreclosure',
                    'preforeclosure': 'Preforeclosure',
                    'bankruptcy': 'Bankruptcy',
                    'tax-lien': 'Tax Lien',
                    'auction': 'Auction',
                    'inheritance': 'Inheritance',
                    'probate': 'Probate',
                    'eviction': 'Eviction',
                    'hoa-lien': 'Hoa Lien',
                    'irs-lien': 'Irs Lien',
                    'mortgage-lien': 'Mortgage Lien',
                    'pre-inheritance': 'Pre Inheritance',
                    'pre-probate': 'Pre Probate',
                    'divorce': 'Divorce',
                    'tax-delinquency': 'Tax Delinquency',
                    'code-violation': 'Code Violation',
                    'absentee-property-owner': 'Absentee Property Owner',
                    'vacancy': 'Vacancy',
                    'debt': 'Debt',
                    'personal-injury': 'Personal Injury',
                    'marriage': 'Marriage',
                    'other-civil': 'Other Civil',
                };

                console.log('size should be no more than maximum pagination size: ', docs.length);
                const records: any[] = [];
                for(const doc of docs) {
                    const record: any = {};
                    record['Full Name'] = doc['ownerId']?.['Full Name'];
                    record['First Name'] = doc['ownerId']?.['First Name'];
                    record['Last Name'] = doc['ownerId']?.['Last Name'];
                    record['Middle Name'] = doc['ownerId']?.['Middle Name'];
                    record['Name Suffix'] = doc['ownerId']?.['Name Suffix'];
                    record['Mailing Address'] = doc['ownerId']?.['Mailing Address'];
                    record['Mailing Unit #'] = doc['ownerId']?.['Mailing Unit #'];
                    record['Mailing City'] = doc['ownerId']?.['Mailing City'];
                    record['Mailing State'] = doc['ownerId']?.['Mailing State'];
                    record['Property Address'] = doc['propertyId']?.['Property Address'];
                    record['Property Unit #'] = doc['propertyId']?.['Property Unit #'];
                    record['Property City'] = doc['propertyId']?.['Property City'];
                    record['Property Zip'] = doc['propertyId']?.['Property Zip'];
                    record['Property State'] = doc['propertyId']?.['Property State'];
                    record['County'] = doc['propertyId']?.['County'];
                    record['Owner Occupied'] = doc['propertyId']?.['Owner Occupied'];
                    record['Property Type'] = doc['propertyId']?.['Property Type'];
                    record['Total Assessed Value'] = doc['propertyId']?.['Total Assessed Value'];
                    record['Last Sale Recording Date'] = doc['propertyId']?.['Last Sale Recording Date'];
                    record['Last Sale Recording Date Formatted'] = doc['propertyId']?.['Last Sale Recording Date Formatted'];
                    record['Last Sale Amount'] = doc['propertyId']?.['Last Sale Amount'];
                    record['Est Value'] = doc['propertyId']?.['Est Value'];
                    record['Est Equity'] = doc['propertyId']?.['Est Equity'];
                    record['Effective Year Built'] = doc['propertyId']?.['Effective Year Built'];
                    record['yearBuilt'] = doc['propertyId']?.['yearBuilt'];
                    record['vacancy'] = doc['propertyId']?.['vacancy'];
                    record['vacancyDate'] = doc['propertyId']?.['vacancyDate'];
                    record['parcel'] = doc['propertyId']?.['parcel'];
                    record['descbldg'] = doc['propertyId']?.['descbldg'];
                    record['listedPrice'] = doc['propertyId']?.['listedPrice'];
                    record['listedPriceType'] = doc['propertyId']?.['listedPriceType'];
                    record['improvval'] = doc['propertyId']?.['improvval'];
                    record['ll_bldg_footprint_sqft'] = doc['propertyId']?.['ll_bldg_footprint_sqft'];
                    record['ll_bldg_count'] = doc['propertyId']['ll_bldg_count'];
                    record['legaldesc'] = doc['propertyId']['legaldesc'];
                    record['sqft'] = doc['propertyId']['sqft'];
                    record['ll_gisacre'] = doc['propertyId']['ll_gisacre'];
                    record['lbcs_activity_desc'] = doc['propertyId']['lbcs_activity_desc'];
                    record['lbcs_function_desc'] = doc['propertyId']['lbcs_function_desc'];
                    record['livingarea'] = doc['propertyId']['livingarea'];
                    record['assessmentyear'] = doc['propertyId']['assessmentyear'];
                    record['assedvalschool'] = doc['propertyId']['assedvalschool'];
                    record['assedvalnonschool'] = doc['propertyId']['assedvalnonschool'];
                    record['taxvalschool'] = doc['propertyId']['taxvalschool'];
                    record['taxvalnonschool'] = doc['propertyId']['taxvalnonschool'];
                    record['justvalhomestead'] = doc['propertyId']['justvalhomestead'];
                    record['effyearbuilt'] = doc['propertyId']['effyearbuilt'];
                    record['practiceType'] = practiceTypes[doc['productId']['name'].split('/')[3].trim()];
                    record['Toal Open Loans'] = doc['propertyId']['Toal Open Loans'];
                    record['Lien Amount'] = doc['propertyId']['Lien Amount'];
                    record['Est. Remaining balance of Open Loans'] = doc['propertyId']['Est. Remaining balance of Open Loans'];
                    record['Tax Lien Year'] = doc['propertyId']['Tax Lien Year'];

                    records.push(record);
                }
                
                return {
                    success: true,
                    data: JSON.stringify(records),
                    count
                };
            } else {
                return {
                    success: false,
                    error: validate.err
                };
            }
        }
    },
    Mutation: {}
}
