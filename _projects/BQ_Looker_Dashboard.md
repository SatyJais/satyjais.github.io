---
layout: page
title: Digital Ads Data Pipeline & Dashboard
description: ETL pipeline and dashboarding for Google & Meta Ads using Google BigQuery(SQL) & Looker Studio
img: assets/img/BQ_Looker_coverimage.png
importance: 2
category: Work
---

## Solution Architecture

<div class="text-center mb-2">
  {% include figure.liquid path="assets/img/BQ_Looker_coverimage.png" title="Data Solution Pipeline Architecture" class="img-fluid rounded z-depth-2" %}
</div>
<div class="caption">Data Solution Pipeline Architecture</div>

---


## Business Background

As the Account/Data Manager for a digital advertising project with a senior living marketplace in the U.S., I was tasked with building a dashboard to monitor campaign performance — both for internal use and for client reporting.

The client's data team provided a Looker dashboard that tracked key post-lead metrics. Meanwhile, my team was responsible for guiding the client in setting up a Google Ads & Meta Ads dashboard focused on pre-lead performance indicators such as spend, CTR, CPC, and CPL — broken down by device type, ad type, gender, and age group.

The objective was not just to track pre-lead trends, but also to establish a clear connection between ad spend, individual keywords & clicks, and lead generation & quality.

---

<div class="row mt-3 mb-5">
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #4285F4;">
      <h2 style="color:#4285F4; font-size:1.9rem; font-weight:700;">~40 hrs</h2>
      <p style="font-size:0.88rem; color:#64748b;">saved per month by eliminating manual reporting</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #34a853;">
      <h2 style="color:#34a853; font-size:1.9rem; font-weight:700;">Real-time</h2>
      <p style="font-size:0.88rem; color:#64748b;">live dashboard for internal team & client stakeholders</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #FF694A;">
      <h2 style="color:#FF694A; font-size:1.9rem; font-weight:700;">Clear</h2>
      <p style="font-size:0.88rem; color:#64748b;">campaign directions by GEO, device, keyword & channel</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #0d9488;">
      <h2 style="color:#0d9488; font-size:1.9rem; font-weight:700;">Zero</h2>
      <p style="font-size:0.88rem; color:#64748b;">reporting errors — fully automated data pipeline</p>
    </div>
  </div>
</div>

---


## Challenge

One of the major hurdles was integrating Google & Meta Ads data with the client's CRM data (lead records). The challenge stemmed from difficulties in locating the correct tables and metrics within the client's existing data infrastructure, limiting our ability to create a seamless connection between marketing efforts and lead outcomes. Even when identified, the whole process was manual.

---

## Solution

### Step 1 — Data Ingestion

#### Google Ads

Bringing Google Ads data into the data warehouse — BigQuery.

<div class="text-center mb-2">
  {% include figure.liquid path="assets/img/Create_Google_Transfer.png" title="Google Ads Data Transfer" class="img-fluid rounded z-depth-1 w-25" %}
</div>
<div class="caption">Google Ads Data Transfer</div>

#### Meta Ads

Setting up the Meta Ads data transfer requires a few more steps. Here's the full process:

**1️⃣ Create a Facebook App (Meta for Developers)**

Go to Meta for Developers → My Apps → Create App. Choose Business type (needed for Ads API access). Provide an App Name, Business Account, and contact email.

**2️⃣ Add the Marketing API product**

In your App dashboard → Add Product → select **Marketing API**. This enables ad account and campaign data access.

**3️⃣ Get the required permissions**

Request the following in App Review → Permissions and Features:
- `ads_read` — read campaign & ad performance data
- `ads_management` — needed for BQ integration
- `business_management`

**4️⃣ Create a System User & Access Token (via Business Manager)**

Go to Business Settings → System Users → Add new system user (Admin role). Assign ad accounts to this user. Generate a long-lived access token with `ads_read` + `ads_management`.

**5️⃣ Set up BigQuery Data Transfer Service**

Keep your token, App ID (client ID), and App Secret handy. In Google Cloud → BigQuery → Data Transfers → Create Transfer. Choose Facebook Ads as the source, authorize with the refresh token, and add client ID & secret.

<div class="text-center mb-2">
  {% include figure.liquid path="assets/img/Facebook_datatransfer.png" title="Facebook Ads Data Transfer" class="img-fluid rounded z-depth-1 w-25" %}
</div>
<div class="caption">Facebook Ads Data Transfer</div>

Select ad account(s) and schedule daily/hourly imports.

---

### Step 2 — Data Cleaning & Transformation

Creating the metadata required to combine metrics from different tables for an integrated view.

#### Step 2.1 — Campaign metadata

```sql
SELECT
  DISTINCT(campaign_id),
  campaign_name,
  campaign_advertising_channel_type,
  campaign_advertising_channel_sub_type,
  campaign_start_date,
  campaign_serving_status
FROM
  `aroscop-456222.********_Adwords.ads_Campaign_9925610920`
WHERE
  campaign_start_date > '2025-02-25'
```

#### Step 2.2 — Campaign metrics & dimensions

```sql
SELECT
  segments_date,
  Campaign.campaign_id,
  Meta.campaign_name,
  Meta.campaign_advertising_channel_type,
  Campaign.metrics_impressions,
  Campaign.metrics_clicks,
  Campaign.metrics_conversions,
  Campaign.segments_device,
  ROUND(Campaign.metrics_cost_micros / 1000000, 2) AS cost
FROM
  `aroscop-456222.********_Adwords.ads_CampaignBasicStats_9925610920` AS Campaign
LEFT JOIN
  `Cleaned_Data_Metadata_********.Campaign_Meta` AS Meta
USING (campaign_id)
ORDER BY segments_date
```

#### Step 2.3 — Click IDs & related metrics

```sql
SELECT
  click_view_gclid,
  Clicks.campaign_id,
  ad_group_id,
  metrics_clicks,
  click_view_keyword,
  click_view_keyword_info_match_type,
  click_view_keyword_info_text,
  click_view_location_of_presence_city,
  click_view_location_of_presence_metro,
  segments_click_type,
  segments_device,
  segments_date
FROM
  `********_Adwords.ads_ClickStats_9925610920` AS Clicks
LEFT OUTER JOIN
  `Cleaned_Data_Metadata_********.Campaign_Meta`
USING (campaign_id)
ORDER BY segments_date
```

#### Step 2.4 — Keyword level information

```sql
SELECT
  ad_group_id,
  campaign_id,
  Meta.campaign_name,
  ad_group_criterion_keyword_match_type,
  ad_group_criterion_keyword_text,
  ad_group_criterion_negative,
  ad_group_criterion_position_estimates_first_page_cpc_micros,
  ad_group_criterion_quality_info_post_click_quality_score
FROM
  `aroscop-456222.********_Adwords.p_ads_Keyword_9925610920` AS Keywords
LEFT JOIN
  `Cleaned_Data_Metadata_********.Campaign_Meta` AS Meta
USING (campaign_id)
WHERE Meta.campaign_start_date >= '2025-02-25'
```

#### Step 2.5 — Search queries (actioned terms only)

```sql
SELECT
  sqt.segments_date,
  sqt.campaign_id,
  cmp.campaign_name,
  sqt.metrics_impressions,
  sqt.metrics_clicks,
  sqt.metrics_conversions,
  sqt.metrics_cost_micros / 1000000 AS cost,
  sqt.segments_device,
  sqt.search_term_view_status,
  sqt.search_term_view_search_term
FROM
  `********_Adwords.ads_SearchQueryStats_9925610920` AS sqt
LEFT JOIN
  `Cleaned_Data_Metadata_********.Campaign_Meta` AS cmp
USING (campaign_id)
WHERE
  cmp.campaign_start_date > '2025-02-25'
  AND sqt.search_term_view_status = 'NONE'
```

---

### Step 3 — Pipeline Orchestration

Automating daily refreshes and incremental appends to all tables.

#### Append new campaign metadata

```sql
INSERT INTO `Cleaned_Data_Metadata_********.Campaign_Meta`
SELECT
  campaign_id,
  campaign_name,
  campaign_advertising_channel_type,
  campaign_advertising_channel_sub_type,
  campaign_start_date,
  campaign_serving_status
FROM `********_Adwords.p_ads_Campaign_9925610920` AS Campaign
WHERE
  NOT EXISTS (
    SELECT campaign_id
    FROM `aroscop-456222.Cleaned_Data_Metadata_********.Campaign_Meta`
    WHERE campaign_id = Campaign.campaign_id
  )
  AND Campaign.campaign_start_date > '2025-02-25'
```

#### Append campaign metrics (incremental)

```sql
INSERT INTO `Cleaned_Data_Metadata_********.Campaign_Metrics`
SELECT
  segments_date,
  Campaign.campaign_id,
  Meta.campaign_name,
  Meta.campaign_advertising_channel_type,
  Campaign.metrics_impressions,
  Campaign.metrics_clicks,
  Campaign.metrics_conversions,
  Campaign.segments_device,
  ROUND(Campaign.metrics_cost_micros / 1000000, 2) AS cost
FROM `aroscop-456222.********_Adwords.ads_CampaignBasicStats_9925610920` AS Campaign
LEFT JOIN `Cleaned_Data_Metadata_********.Campaign_Meta` AS Meta
USING (campaign_id)
WHERE Campaign.segments_date > (
  SELECT MAX(segments_date) FROM `Cleaned_Data_Metadata_********.Campaign_Metrics`
)
ORDER BY segments_date
```

#### Append click IDs (deduped)

```sql
INSERT INTO `Cleaned_Data_Metadata_********.Clicks_Gclids`
SELECT
  click_view_gclid,
  Clicks.campaign_id,
  ad_group_id,
  metrics_clicks,
  click_view_keyword,
  click_view_location_of_presence_city,
  click_view_location_of_presence_metro,
  segments_device,
  segments_date
FROM `********_Adwords.ads_ClickStats_9925610920` AS Clicks
LEFT OUTER JOIN `Cleaned_Data_Metadata_********.Campaign_Meta`
USING (campaign_id)
WHERE
  Clicks.segments_date > (
    SELECT MAX(segments_date) FROM `Cleaned_Data_Metadata_********.Clicks_Gclids`
  )
  AND NOT EXISTS (
    SELECT * FROM `Cleaned_Data_Metadata_********.Clicks_Gclids` AS Old
    WHERE Old.click_view_gclid = Clicks.click_view_gclid
  )
ORDER BY Clicks.segments_date
```

#### Append search queries (incremental)

```sql
INSERT INTO `Cleaned_Data_Metadata_********.Search_Queries`
SELECT
  sqt.segments_date,
  sqt.campaign_id,
  cmp.campaign_name,
  sqt.metrics_impressions,
  sqt.metrics_clicks,
  sqt.metrics_conversions,
  sqt.metrics_cost_micros / 1000000 AS cost,
  sqt.segments_device,
  sqt.search_term_view_status,
  sqt.search_term_view_search_term
FROM `********_Adwords.ads_SearchQueryStats_9925610920` AS sqt
LEFT JOIN `Cleaned_Data_Metadata_********.Campaign_Meta` AS cmp
USING (campaign_id)
WHERE
  cmp.campaign_start_date > '2025-02-25'
  AND sqt.search_term_view_status = 'NONE'
  AND sqt.segments_date > (
    SELECT MAX(segments_date) FROM `Cleaned_Data_Metadata_********.Search_Queries`
  )
```

#### Scheduling all queries to run daily

<div class="text-center mb-2">
  {% include figure.liquid path="assets/img/Scheduled_Queries.png" title="Scheduled SQL Queries" class="img-fluid rounded z-depth-1 w-25" %}
</div>
<div class="caption">Scheduled SQL Queries in BigQuery</div>

---

### Step 4 — Connecting to Looker Studio

<div class="text-center mb-2">
  {% include figure.liquid path="assets/img/ConnectingtoLooker.png" title="Bringing Data to Looker Studio" class="img-fluid rounded z-depth-1 w-50" %}
</div>
<div class="caption">Bringing cleaned BigQuery tables into Looker Studio</div>

---

### Step 5 — Dashboard & GCLID Exposure

Built a live Looker Studio dashboard and exposed Google Click IDs (GCLIDs) so the client could join ad click data to their CRM lead records.

<div class="row justify-content-sm-center mt-3 mb-2">
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/Campaign_performance.png" title="Campaign Performance" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/Device-Adtype.png" title="Device & Ad Type" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/GClid.png" title="Google Click ID View" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

---

### Step 6 — Joining CRM & Google Ads Data

Joined CRM lead records to Google Ads click data via GCLID to map each lead back to the campaign, keyword, device, and location that drove it — enabling insight into lead quality, not just lead volume.

<div class="text-center mb-2">
  {% include figure.liquid path="assets/img/Joins_in_Looker.png" title="Table joins in Looker" class="img-fluid rounded z-depth-1 w-50" %}
</div>
<div class="caption">Table joins in Looker Studio — CRM × Google Ads</div>

---

## Tech Stack

<div class="row mt-2">
  <div class="col-12">
    <span class="badge" style="background:#4285F4; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Google Ads API</span>
    <span class="badge" style="background:#0866FF; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Meta Ads API</span>
    <span class="badge" style="background:#1a73e8; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">BigQuery</span>
    <span class="badge" style="background:#334155; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">SQL</span>
    <span class="badge" style="background:#34a853; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Looker Studio</span>
    <span class="badge" style="background:#0d9488; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">BigQuery Data Transfer</span>
    <span class="badge" style="background:#64748b; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Scheduled Queries</span>
  </div>
</div>
