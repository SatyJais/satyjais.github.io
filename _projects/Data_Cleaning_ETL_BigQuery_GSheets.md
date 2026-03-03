---
layout: page
title: BigQuery (SQL) & GSheets — Data Ingestion to Live Dashboard
description: Streamlined campaign reporting workflow to improve accuracy, reduce manual effort, and enable faster decisions.
img: assets/img/Project2_cover_image2.png
importance: 3
category: Work
---
# Solution Architecture
<div class="text-center">
  {% include figure.liquid path="assets/img/Project2_cover_image2.png" title="Data discrepancy" class="img-fluid d-inline-block" %}
</div>
<div class="caption">
  Data Solution Pipeline Architecture
</div>


### Business background
I managed digital marketing for a major US telecom’s B2B division. Campaigns included Programmatic Display and Google Ads (Search, Display, Video). The core KPIs were **Cost per Lead**, **SQLs**, and **Cost per Opportunity**.

### Problem
The reporting workflow was fragile and manual:
- Multiple data sources
- New Excel/Google Sheet created for every report
- Duplicate data and inconsistent logic across versions
- Missing updates to older leads and opportunities

Bottom line: there was no **single source of truth**, so performance was often **under-reported**.

---

# What was broken

### Key issues in the existing reporting system
- Leads were not reliably recorded using a stable primary key (Lead ID).
- Historical leads were not updated. Example scenarios:
  - A lead disqualified later did not get reflected
  - An opportunity added later was missed, leading to under-reported wins
- Leads from **Inbound calls, Chatbot, Calendly** often lacked UTM tags.
  - The client manually added tags occasionally, but future sheets frequently missed the same tags again.

**Result:** data was not dynamically updated, and reporting drifted over time.

---

# Impact (Data discrepancies)

### Example outcomes
- **Missing leads**
  - Leads in CRM sheets (Jan–17 Sep): **3061**
  - Leads in the most recent sheet (Jan–17 Sep): **2978**
- **Missed opportunities**
  - ~**25%** error rate in the existing system

<div class="text-center">
  {% include figure.liquid path="assets/img/Descrepenacies_in_Data.png" title="Data discrepancy" class="img-fluid d-inline-block w-25" %}
</div>
<div class="caption">
  Discrepancies in data (reported vs actuals)
</div>

---

# Solution approach

To create an error-proof unified system, we built a continuously updated **living source of truth**.

**Design goals**
1. Automate workflows (remove manual rework)
2. Maintain data integrity (primary keys + consistent updates)
3. Always report using the latest, most complete data

---

## Proposed workflow (ETL)

<div class="project-section">
  <h2 class="section-load">Extract</h2>
  <p>Ingest CRM CSV files into BigQuery and maintain a master table that updates historical records.</p>
</div>

### Step 1 — Create the MasterSheet table
```sql
CREATE TABLE `.....Sheets.MasterSheet` (
  Lead_ID STRING,
  Created_Date DATE,
  Account_Engagement_Created_Date STRING,
  Entry_Status STRING,
  Lead_Status STRING,
  Company___Account STRING,
  City STRING,
  State_Province STRING,
  Zip_Postal_Code STRING,
  utm_source STRING,
  utm_medium STRING,
  utm_campaign STRING,
  Google_Analytics_Source STRING,
  Google_Analytics_Medium STRING,
  Google_Analytics_Campaign STRING,
  Google_Analytics_Content STRING,
  Google_Analytics_Term STRING,
  Disqualified_Reason STRING,
  Primary_Source STRING,
  Stage STRING,
  Total_Lines INTEGER,
  Handset_Qty INTEGER,
  IoT_Qty INTEGER,
  Connected_Device_Qty INTEGER,
  No__of_Employees INTEGER
);
``` 

### Step 2 - Populating Master sheet (with the first sheet)

```sql
INSERT INTO
  `.....Sheets.MasterSheet`
SELECT
  Lead_ID,
  Created_Date,
  Account_Engagement_Created_Date,
  Entry_Status,
  Lead_Status,
  Company___Account,
  City,
  State_Province,
  Zip_Postal_Code,
  utm_source,
  utm_medium,
  utm_campaign,
  Google_Analytics_Source,
  Google_Analytics_Medium,
  Google_Analytics_Campaign,
  Google_Analytics_Content,
  Google_Analytics_Term,
  Disqualified_Reason,
  Primary_Source,
  Stage,
  Total_Lines,
  Handset_Qty,
  IoT_Qty,
  Connected_Device_Qty,
  No__of_Employees
FROM
  `....Sheets.May_17_2023`
```

### Step 3 - Updating Mastersheet with New CRM data sheet (recurring)

```sql
UPDATE
`dataanalytics-2023-394903.USCC_Leads_CRM_Sheets.MasterSheet` AS M
SET
M.Lead_Status = N.Lead_Status,
M.Disqualified_Reason = N.Disqualified_Reason,
M.Stage = N.Stage,
M.Total_Lines = N.Total_Lines,
M.Handset_Qty = N.Handset_Qty,
M.IoT_Qty = N.IoT_Qty,
M.utm_source = IFNULL(M.utm_source,N.utm_source),
M.utm_medium = IFNULL(M.utm_medium,N.utm_medium),
M.utm_campaign = IFNULL(M.utm_campaign,N.utm_campaign),
M.Connected_Device_Qty = N.Connected_Device_Qty
FROM
`dataanalytics-2023-394903.USCC_Leads_CRM_Sheets.Sep_27_2023` AS N
WHERE
M.Lead_ID = left(N.Lead_ID,15)
```
### Step 4 - Inserting (APPENDING) new rows from the new sheet into master sheet (recurring)

```sql 
INSERT INTO
`.....Sheets.MasterSheet`
SELECT
Left(Lead_ID,15),
Created_Date,
Account_Engagement_Created_Date,
Entry_Status,
Lead_Status,
Company___Account,
City,
State_Province,
Zip_Postal_Code,
utm_source,
utm_medium,
utm_campaign,
Google_Analytics_Source,
Google_Analytics_Medium,
Google_Analytics_Campaign,
Google_Analytics_Content,
Google_Analytics_Term,
Disqualified_Reason,
Primary_Source,
Stage,
Total_Lines,
Handset_Qty,
IoT_Qty,
Connected_Device_Qty,
No__of_Employees
FROM
`.....Sheets.Sep_27_2023` AS N
WHERE NOT EXISTS
(
SELECT
Lead_ID,
Created_Date,
Account_Engagement_Created_Date,
Entry_Status,
Lead_Status,
Company___Account,
City,
State_Province,
Zip_Postal_Code,
utm_source,
utm_medium,
utm_campaign,
Google_Analytics_Source,
Google_Analytics_Medium,
Google_Analytics_Campaign,
Google_Analytics_Content,
Google_Analytics_Term,
Disqualified_Reason,
Primary_Source,
Stage,
Total_Lines,
Handset_Qty,
IoT_Qty,
Connected_Device_Qty,
No__of_Employees
FROM
`dataanalytics-2023-394903.USCC_Leads_CRM_Sheets.MasterSheet`
WHERE
Lead_ID = left(N.Lead_ID,15)
)
```


<div class="project-section"> 
  <h2 class="section-load">Transform</h2> 
  <p> Standardise IDs, enrich missing UTM fields, and remove inconsistencies to make the dataset reporting-ready.</p> 
</div>

### Step 5 - Data Cleaning & Transformation
 - In some Client sheets Lead_Id (the primary key) is 18 chars long while other sheets have 15 Chars as the length - mapping the first 15 chars in all cases works
 - Missing utm tag fields where Google tags are present.


**Merging Two columns to avoid NULL values in the Google Tags(Source, Medium, Campaign) values**

```sql
UPDATE
 `dataanalytics-2023-394903.USCC_Leads_CRM_Sheets.MasterSheet`
 SET
 utm_source=coalesce(utm_source,Google_Analytics_Source),
 utm_medium=coalesce(utm_medium,Google_Analytics_Medium),
 utm_campaign=coalesce(utm_campaign,Google_Analytics_Campaign)
 WHERE
 utm_source Like 'google'
```

**Cleaning & Replacing Blank UTM_Campaign with Google_Campaign**
``` sql
​​update
`dataanalytics-2023-394903.USCC_Leads_CRM_Sheets.MasterSheet`
set
utm_campaign = Google_Analytics_Campaign
WHERE
utm_source like 'google'
AND
utm_campaign = ''
```


<div class="row justify-content-sm-center">
  <div class="col-sm-8 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/Connecting_to_GSheet_2.png" title="Connecting to GSHeets" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/Connnected_Gsheet.png" title="Connecting to GSHeets" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
<div class="caption">
    Connecting the CRM data to a dynamic Google Sheet for analysis & reporting
</div>


<div class="project-section"> 
  <h2 class="section-load">Load</h2> 
  <p>Pull the transformed CRM master data into Google Sheets, bring Google Ads via Coefficient, and build a live dashboard.</p> 
</div>

### Bring transformed CRM data from the intermediary Google Sheet to combine with the Google Ads data.
```
=importrange("1xad-3kfzmFDzjxLdkrFDIm-fE_kkDYn_2tVJCe6iQFY","Extract 1!A:Y")
```
<div class="project-section">
</div>
### Filtering data for leads from specific sources using GSHeet formulas
```
Query(MasterData_CRM_Leads!$A:$AB,"select count(A) where J contains 'google' AND Not K contains 'organic' AND B >= date'"&TEXT(B3,"yyyy-mm-dd")&"' AND (S = 'Website' OR S contains 'google') AND B <= date'"&text(C3,"yyyy-mm-dd")&"' AND Not L contains 'bi_failover_sciera_23_q3_pmax' Label count(A) 'Formfills'",1)
```
<div class="project-section">
</div>

## Final result -  Bringing the data from both sources to create a real-time & dynamic dashboard

<div class="row justify-content-sm-center">
    <div class="col-sm-8 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/LiveCHart.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm-4 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/Live_Table.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Real-time Dashboard for centralised, error-free and live reporting to internal & external stakeholders
</div>
