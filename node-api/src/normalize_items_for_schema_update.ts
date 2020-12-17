import db from './models/db';
import mongoose from 'mongoose';

(async () => {

    let namesUpdated = 0;
    let updateFailed = 0;
    let documentsParsed = 0;

    const cursor = db.models.LineItem.find({
        $and: [
            { $or: [{ 'vacancyProcessed': true }, { 'propertyAppraiserProcessed': true }] },
            { $or: [{ 'Full Name': { $exists: false } }, { 'Full Name': '' }] }
        ], 'schemaUpdateFailReason': {$exists: false}
    }).cursor();

    for (let namelessDoc = await cursor.next(); namelessDoc !== null; namelessDoc = await cursor.next()) {
        documentsParsed++;

        let docObj = namelessDoc.toObject();
        if (docObj.hasOwnProperty('owner_full_name') && docObj['owner_full_name'].trim()) {
            namesUpdated++;
            namelessDoc['Full Name'] = docObj['owner_full_name'];
            await namelessDoc.save();
        } else {
            let fullNameString = '';
            if (docObj.hasOwnProperty('Last Name')) fullNameString += docObj['Last Name'];
            if (fullNameString.trim() && (docObj.hasOwnProperty('First Name') || docObj.hasOwnProperty('Middle Name') || docObj.hasOwnProperty('Name Suffix'))) fullNameString += ', ';
            if (docObj.hasOwnProperty('First Name')) fullNameString += docObj['First Name'];
            if (docObj.hasOwnProperty('Middle Name')) fullNameString += ' ' + docObj['Middle Name'];
            if (docObj.hasOwnProperty('Name Suffix')) fullNameString += ' ' + docObj['Name Suffix'];

            if (fullNameString.trim()) {
                namesUpdated++;
                namelessDoc['Full Name'] = fullNameString;
                await namelessDoc.save();
            } else {
                updateFailed++;
                namelessDoc['schemaUpdateFailReason'] = 'name';
                await namelessDoc.save()
            }
        }
    }

    console.log(`Total documents parsed: ${documentsParsed}`);
    console.log(`   Added names to ${namesUpdated} documents.`);
    console.log(`   ${updateFailed} documents have missing names.`);
    

    await mongoose.disconnect();
})();