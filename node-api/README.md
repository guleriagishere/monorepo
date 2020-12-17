## TEMPORARY NOTES (11-6-2020):
Normalization to the db occurred. You must run the scripts in the migrations folder!

## HomeSalesClub API Objectives

HomeSalesClub is a factory service to capture data from public records. With the wealth of data at our fingertips, we perform statistical probability distribution calculations on the data to project changes in given industries.

## Installation

1. Copy environment variables from AWS account (System Manager's Parameter Store) in a .env file at root of project

2. Seed Database

```
$ npm run static_seed
```

3. Run Server via docker

```
$ docker-compose up
```

## Task Scheduler Overview

scrapetorium-civil-produce2-scheduled-task
cron(*/5 18 * * ? *)
6pm -> 24 * 60 / 5 * 4 = every 5 minutes in a 24 hour period it will run 4 tasks, totaling 1152 task runs

scrapetorium-auctioncom-produce-scheduled-task
cron(*/10 22-7 * * ? *)
6pm-3am -> 60/10 = 6 times per hour * 9 hours = 54 runs (for 51 counties)

scrapetorium-foreclosurecom-produce-scheduled-task
cron(*/10 22-7 * * ? *)
6pm-3am -> 60/10 = 6 times per hour * 9 hours = 54 runs (for 51 counties)

scrapetorium-reset-data-aggregator-producers-scheduled-task
cron(45 21 * * ? *)
5:45pm -> reset the foreclosure/auction types in public_record_producers collection (in another 15 minutes they will run again)

scrapetorium-reset-civil-producers-scheduled-task
cron(45 21 * * ? *)
5:45pm -> reset the civil types in public_record_producers collection (in another 15 minutes they will run again)

scrapetorium-county-property-appraiser-consume-scheduled-task
cron(*/2 11-16 * * ? *)
7am-12pm -> 30 * 5 = 150 runs (for 137 counties)

scrapetorium-cali-property-appraiser-consume-scheduled-task
cron(0 11 * * ? *)
11am -> runs all california within 24 hours

scrapetorium-landgrid-property-appraiser-consume-scheduled-task
cron(*/2 * * * ? *)
run after county-property-appraiser-consume, in order to fill in the remaining fields (this will also fill in the counties not part of the original list of 137)

(24 * 60 = 1440 minutes per day)
(1440 * 2 = 2880 minutes in 2 days)
2880 / 1000 = 2.88 (every 2 minutes we should invoke new county)

scrapetorium-reset-landgrid-pa-consumers-scheduled-task
cron(0 0 */2 * ? *)
reset the public record producers containing 'landgrid-property-appraiser-consumer' every 48 hours. Since landgrid-property-appraiser-consume will be running every 2 minutes, after 48 hours we need to reset the public record producers as unprocessed, so a loop occurs

## Diagnosing Scripts

The PA consumer scripts are critical to fill in missing details. This is how to diagnose how effective landgrid consumer is:

1. Confirm script ran: 
// public_record_producers
{ source: 'civil', processed: true }

2. Given that Maricopa successfully ran, then search the product ids:
// products
db.products.find({ name: /^\/az\/maricopa/}).map( doc => doc._id )

3. Query owner_product_properties by those product ids:
// owner_product_properties
{ 
    landgridPropertyAppraiserProcessed: true,
    productId: { $in: [
    ObjectID("5f3fdfe25461f700251c7fae"),
    ObjectID("5f3fdfdf5461f700251c7fa2"),
    ...
    ]}
}

4. Now determine the success rate of the county:
// owner_product_properties
{
        landgridPropertyAppraiserProcessed: true,
        ownerId: { $ne: null },
        propertyId: { $ne: null },
        productId: {
          $in: [
            ObjectID("5f3fdfe25461f700251c7fae"),
            ObjectID("5f3fdfdf5461f700251c7fa2"),
            ...

904 (total owner_product_properties for maricopa from query in step 4)
DIVIDED BY
20583 (total owner_product_properties for maricopa from query in step 3)
ratio = 904 / 20583 * 100 = 4%

5. Isolate the problematic data:
{
    landgridPropertyAppraiserProcessed: true,
    ownerId: { $ne: null },
    propertyId: { $eq: null },
    productId: {
        $in: [
            ObjectID("5f3fdfe25461f700251c7fae"),
            ObjectID("5f3fdfdf5461f700251c7fa2"),
            ...

6. Take ownerId from owner_product_properties and then search by _id in owners collection:
// owners
{ _id: ObjectId('')}

7. Now check County Property Appraiser and compare it with Landgrid response to see why Landgrid was unable to find the match

## Chief Architect

Daniel Viglione
scrapetorium.com
'Statistics you can believe in'
  
