---
layout: page
title: "Marketing Analytics Pipeline & Live Dashboard"
description: "End-to-end ELT pipeline and real-time dashboard for a US Senior Living Marketplace — integrating Google Ads, Meta Ads & CRM data via BigQuery, dbt & Looker Studio"
img: assets/img/ELT_ads_data_pipeline_architecture.png
importance: 1
category: Data Engineering
---

## Overview

As the **Data Lead and Account Manager** for a US-based Senior Living Marketplace, I designed and built a fully automated marketing analytics system from the ground up — covering data ingestion, transformation, and real-time dashboard delivery for both internal and client-side stakeholders.

The client was running **20+ digital advertising campaigns across 20 cities in the US**, with spend split across Google Ads and Meta Ads. Data was fragmented, reporting was manual, and the team had no single view to make confident campaign decisions.

---

## The Problem

The marketing team faced three compounding challenges:

- **No single source of truth** — Google Ads, Meta Ads, and CRM lead data lived in separate platforms with no unified view
- **Manual reporting overhead** — pulling, cleaning, and stitching data together consumed ~50 hours per month
- **Delayed decisions** — by the time reports were ready, campaign conditions had already changed

---

## What I Built

### 1. ELT Pipeline — BigQuery + dbt

Designed a multi-source ELT pipeline ingesting raw data from three sources into BigQuery via scheduled transfers:

- **Google Ads** — campaign metrics, click stats, search query data, geo performance
- **Meta Ads** — campaign data, ad insights, audience breakdown
- **CRM** — lead records, engagement milestones, acquisition metadata

Raw tables were transformed using **dbt**, with a structured DAG covering staging, intermediate, and mart layers.

<div class="row mt-4 mb-4">
  <div class="col-12">
    {% include figure.liquid loading="eager" path="assets/img/ELT_ads_data_pipeline_architecture.png" class="img-fluid rounded z-depth-2" caption="ELT Pipeline Architecture — Google Ads, Meta Ads & CRM → BigQuery → dbt → Looker Studio" %}
  </div>
</div>

### 2. dbt Data Model (DAG)

The dbt transformation layer handled deduplication, schema normalisation, CRM-to-ads joining, and KPI aggregation. Key models included:

**Staging models: Bronze (Raw / Source-aligned)**
- `Google_Ads_Campaign_Data` — cleaned campaign metrics from raw Adwords tables
- `Google_Ads_Metadata` — campaign metadata and structure
- `stg_Facebook_Ads` — normalised Meta Ads data
- `Gclid_all` / `Gclid_filtered` — click ID resolution for attribution
- `Leads` — cleaned CRM lead records
- `DOs` — downstream opportunity records
- `UTM_Tags` — parsed UTM parameters for attribution

**Intermediate models: Silver (Staging / Standardised)**
- `AT_Ads_Mapped` — ads mapped to active tours
- `Discussing_Options_Ads_Mapped` — ads linked to discussion-stage leads
- `Leads_Ads_Mapped` — full CRM-to-ad join
- `Meta_Ads_Metrics_incomplete` → `Meta_Ads_Metrics_Summary`
- `Adwords_Geo_Analysis` — geo-level performance

**Mart models: (dashboard-ready / Business-ready)**
- `Google_Ads_Metrics` — aggregated Google performance
- `combined_metrics` — cross-platform unified view
- `Device_Type_Summary` — performance by device
- `Dos_by_Campaign_Type` — opportunities by campaign
- `utm_tags_analysis` — UTM-level attribution
- `Google_Geo_Analysis_Leads_DOs` — geo × lead × opportunity breakdown
- `leads_by_campaign_type` — lead volume by campaign type

<div class="row mt-4 mb-4">
  <div class="col-12">
    {% include figure.liquid loading="eager" path="assets/img/dbt_dataflow-dag.png" class="img-fluid rounded z-depth-2" caption="dbt DAG — full dependency graph from raw sources to mart tables" %}
  </div>
</div>

---

## SQL — Key dbt Models

Three representative models that power the dashboard:

### `combined_metrics` — Cross-Channel Daily Spend & Funnel

This mart model joins Google and Meta daily spend with CRM funnel stages (Leads → DOs → Active Tours → Wins) to give a unified cross-channel view for each day.

```sql
with
    google as (select * from {{ ref("Google_Ads_Metrics") }}),
    meta as (select * from {{ ref("Meta_Ads_Metrics_Summary") }}),
    leads as (select * from {{ ref("Leads_Ads_Mapped") }}),
    dos as (select * from {{ ref("Discussing_Options_Ads_Mapped") }}),
    ats as (select * from {{ ref('AT_Ads_Mapped') }}),
    wins as (select * from {{ ref('AT_Ads_Mapped') }} where stage = 'Won'),

    google_spend as (
        select segments_date, sum(cost) as google_cost
        from google group by segments_date
    ),
    meta_spend as (
        select date, sum(amount_spent_usd) as meta_cost
        from meta group by date
    ),
    leads_daily_meta as (
        select date, count(*) as meta_leads
        from leads where channel = 'Meta' group by date
    ),
    leads_daily_google as (
        select date, count(*) as google_leads
        from leads where channel = 'Google' group by date
    ),
    dos_daily_meta as (
        select date, count(*) as meta_dos
        from dos where channel = 'Meta' group by date
    ),
    dos_daily_google as (
        select date, count(*) as google_dos
        from dos where channel = 'Google' group by date
    ),
    ats_daily_meta as (
        select date, count(*) as meta_ats
        from ats where channel = 'Meta' group by date
    ),
    ats_daily_google as (
        select date, count(*) as google_ats
        from ats where channel = 'Google' group by date
    ),
    wins_daily_meta as (
        select date, count(*) as meta_wins
        from wins where channel = 'Meta' group by date
    ),
    wins_daily_google as (
        select date, count(*) as google_wins
        from wins where channel = 'Google' group by date
    ),

    final as (
        select
            g.segments_date                       as date,
            g.google_cost,
            m.meta_cost,
            coalesce(lm.meta_leads,   0)          as meta_leads,
            coalesce(lg.google_leads, 0)          as google_leads,
            coalesce(dm.meta_dos,     0)          as meta_dos,
            coalesce(dg.google_dos,   0)          as google_dos,
            coalesce(am.meta_ats,     0)          as meta_ats,
            coalesce(ag.google_ats,   0)          as google_ats,
            coalesce(wm.meta_wins,    0)          as meta_wins,
            coalesce(wg.google_wins,  0)          as google_wins
        from google_spend g
        left join meta_spend          m  on g.segments_date = m.date
        left join leads_daily_meta    lm on g.segments_date = lm.date
        left join leads_daily_google  lg on g.segments_date = lg.date
        left join dos_daily_meta      dm on g.segments_date = dm.date
        left join dos_daily_google    dg on g.segments_date = dg.date
        left join ats_daily_meta      am on g.segments_date = am.date
        left join ats_daily_google    ag on g.segments_date = ag.date
        left join wins_daily_meta     wm on g.segments_date = wm.date
        left join wins_daily_google   wg on g.segments_date = wg.date
        order by g.segments_date
    )

select * from final
```

---

### `Device_Type_Summary` — Google Performance by Device

Breaks down impressions, clicks, spend, and full funnel metrics (Leads → DOs → ATs → Wins) by device type — used to drive device-level bid strategy.

```sql
with
    dos_mapped     as (select * from {{ ref("Discussing_Options_Ads_Mapped") }}),
    leads_mapped   as (select * from {{ ref("Leads_Ads_Mapped") }}),
    ats_mapped     as (select * from {{ ref("AT_Ads_Mapped") }}),
    google_metrics as (select * from {{ ref("Google_Ads_Metrics") }}),

    daily_dos as (
        select date, device, count(user_id) as dos
        from dos_mapped where channel = 'Google'
        group by date, device
    ),
    daily_leads as (
        select date, device, count(user_id) as leads
        from leads_mapped where channel = 'Google'
        group by date, device
    ),
    daily_ats as (
        select date, device, count(user_id) as ats
        from ats_mapped where channel = 'Google'
        group by date, device
    ),
    daily_wins as (
        select date, device, count(user_id) as wins
        from ats_mapped where channel = 'Google' and stage = 'Won'
        group by date, device
    ),
    daily_google_metrics as (
        select
            segments_date,
            segments_device,
            sum(metrics_impressions) as impressions,
            sum(metrics_clicks)      as clicks,
            sum(metrics_conversions) as conversions,
            sum(cost)                as spends
        from google_metrics
        group by segments_date, segments_device
    ),

    combined as (
        select
            segments_date,
            segments_device,
            impressions,
            clicks,
            conversions,
            spends,
            coalesce(leads, 0) as leads,
            coalesce(dos,   0) as dos,
            coalesce(ats,   0) as ats,
            coalesce(wins,  0) as wins
        from daily_google_metrics gm
        left join daily_leads dl
            on gm.segments_date = dl.date and gm.segments_device = dl.device
        left join daily_dos dd
            on gm.segments_date = dd.date and gm.segments_device = dd.device
        left join daily_ats da
            on gm.segments_date = da.date and gm.segments_device = da.device
        left join daily_wins dw
            on gm.segments_date = dw.date and gm.segments_device = dw.device
        order by segments_date desc
    )

select * from combined
```

---

### `Google_Geo_Analysis_Leads_DOs` — Geo Attribution via GCLID

Resolves each ad click's geographic origin to a lead or DO by matching click IDs (GCLIDs) from Google Ads back to CRM records — enabling city-level attribution.

```sql
with
    geo_data as (select * from {{ ref('Adwords_Geo_Analysis') }}),
    leads    as (select * from {{ ref('Leads_Ads_Mapped') }}),
    dos      as (select * from {{ ref('Discussing_Options_Ads_Mapped') }}),

    geo_mapped as (
        select
            segments_date,
            click_view_gclid,
            campaign_name,
            Name as geo_name,
            case
                when click_view_gclid in (select gclick_id from leads)
                then 1 else 0
            end as is_lead,
            case
                when click_view_gclid in (select gclick_id from dos)
                then 1 else 0
            end as is_DO
        from geo_data
        order by segments_date desc
    )

select * from geo_mapped
```

---

### 3. Live Dashboard — Looker Studio

Built a real-time Looker Studio dashboard connected directly to BigQuery mart tables, shared with the internal team, client marketing, and client leadership.

<div class="row">
    <div class="col-sm-8 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/Seniorly_Dashboard1.png" title="Overview — Total Leads, DOs, Active Tours, Wins, CPL and spend trends across Google & Meta" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm-4 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/Seniorly_Dashboard2.png" title="Channel Comparison — CPL, CPDO, CPAT and Cost Per Win split across Google Ads vs Meta Ads, with weekly breakdown table" class="img-fluid rounded z-depth-1" %}
    </div>
     <div class="col-sm-4 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/Seniorly_Dashboard3.png" title="Google Ads deep-dive — Leads, DOs and ATs by keyword, campaign type and device" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

The dashboard provided campaign direction across four key dimensions:

| Dimension | Insight Delivered |
|---|---|
| **GEO** | Performance by city — which markets drive leads vs spend |
| **Device Type** | Mobile vs desktop split |
| **Campaign Type** | Performance by Campaign Type - Search Vs PMAX Vs Display |
| **Channel** | Informing budget allocation |

---

## Results

<div class="row mt-3">
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #4285F4;">
      <h2 style="color:#4285F4; font-size:2rem; font-weight:700;">~50 hrs</h2>
      <p style="font-size:0.9rem; color:#64748b;">saved per month by eliminating manual reporting</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #34a853;">
      <h2 style="color:#34a853; font-size:2rem; font-weight:700;">Real-time</h2>
      <p style="font-size:0.9rem; color:#64748b;">dashboard replacing static weekly reports</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #FF694A;">
      <h2 style="color:#FF694A; font-size:2rem; font-weight:700;">20+ campaigns</h2>
      <p style="font-size:0.9rem; color:#64748b;">tracked across Google & Meta simultaneously</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #0d9488;">
      <h2 style="color:#0d9488; font-size:2rem; font-weight:700;">20 cities</h2>
      <p style="font-size:0.9rem; color:#64748b;">of US market coverage with geo-level insights</p>
    </div>
  </div>
</div>

---

## My Role

I was the sole data engineer and account lead on this project, responsible for:

- **Architecture** — designing the full ELT pipeline from scratch
- **Data modelling** — building and maintaining all dbt models in the DAG
- **Dashboard design** — structuring KPIs and views for different audience types
- **Stakeholder management** — translating data insights into campaign decisions for the client team
- **Ongoing maintenance** — ensuring data freshness, integrity, and pipeline reliability

---

## Tech Stack

<div class="row mt-2">
  <div class="col-12">
    <span class="badge" style="background:#4285F4; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Google Ads API</span>
    <span class="badge" style="background:#0866FF; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Meta Ads API</span>
    <span class="badge" style="background:#1a73e8; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">BigQuery</span>
    <span class="badge" style="background:#FF694A; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">dbt Core</span>
    <span class="badge" style="background:#34a853; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Looker Studio</span>
    <span class="badge" style="background:#0d9488; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">CRM</span>
    <span class="badge" style="background:#334155; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">SQL</span>
  </div>
</div>
