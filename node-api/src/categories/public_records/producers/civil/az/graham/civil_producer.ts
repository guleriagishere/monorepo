import { IPublicRecordProducer } from '../../../../../../models/public_record_producer';
import CountyRecorderAZ from "../countyrecorder_az";

export default class CivilProducer extends CountyRecorderAZ {
    state = 'AZ';
    fullState = 'Arizona';
    county = 'Graham';

    constructor(publicRecordProducer: IPublicRecordProducer) {
        // @ts-ignore
        super(publicRecordProducer);
    }
}
