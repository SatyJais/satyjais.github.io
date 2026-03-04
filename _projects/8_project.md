---
layout: page
title: Keyword-driven influencer discovery (Python)
description: keyword-driven influencer discovery application using Python & Streamlit
img: assets/img/9.jpg
importance: 1
category: Vibecoding
giscus_comments: false
---

# Final User Interface - https://youtubeinfluencers.streamlit.app/ 
<div class="text-center">
  {% include figure.liquid path="assets/img/YouTubeCreatorFinder.png" title="Influencer Discovery" class="img-fluid d-inline-block" %}
</div>
<div class="caption">
  YouTube Influencer Discovery
</div>

A **keyword-driven influencer discovery application** built using **Streamlit** and the **YouTube Data API v3**.  
The tool enables discovery of **small to mid-sized YouTube creators across any niche**, with pagination, audience-size filtering, and exportable datasets.

**Business Problem** - As part of the go-to-market (GTM) strategy for an AI-driven test-prep platform, the marketing team needed to build a scalable pool of micro- and mid-tier influencers for content creation, influencer campaigns, video collaborations, and platform reviews.
There was no reliable, affordable directory of education-focused creators, and manual discovery was slow, inconsistent, and not repeatable.

**Solution**- I led the GTM initiative and designed an automated creator-discovery solution to eliminate manual research. Using a rapid, AI-assisted development approach, I built a tool that programmatically identifies YouTube creators based on keyword signals in channel metadata, video titles, and descriptions—allowing the team to surface relevant education-niche creators at scale. 

**Tech stack used** - The solution uses Python as the programming language, Google YouTube data API for  Creator and video metadata extraction and Streamlit to host as a light weight web user interface

**Results** - 
- Enabled rapid identification of micro- to mid-size education influencers aligned with the GTM strategy
- Reduced manual creator discovery effort significantly
- Supported outbound outreach workflows by generating structured creator shortlists
- Successfully onboarded 5 creators into the influencer program within the initial rollout

---

## 🚀 Overview

This application allows users to:
- Search YouTube creators by **any keyword**
- Paginate through large result sets
- Filter creators by **subscriber count**
- Export structured data for **outreach, GTM, or analysis**

The project is designed to be **API-first**, **deployment-ready**, and **easily extensible**.

---

## ✨ Key Features

- Keyword-based creator discovery (channel metadata)
- Pagination support (50 results per page)
- Subscriber-range filtering
- CSV export for downstream workflows
- Secure API key handling
- Streamlit Cloud deployment support

---

## 🧱 Tech Stack

- **Python**
- **Streamlit**
- **YouTube Data API v3**
- **Pandas**

---

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/sat-scraper.git
cd sat-scraper
```
### 2. Create a Virtual Environment (Optional but Recommended)
```bash
python -m venv venv
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate         # Windows
```
### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Steps to Generate an API Key

1. Visit https://console.developers.google.com/
2. Create a new project
3. Enable YouTube Data API v3
4. Go to APIs & Services → Credentials
5. Create an API key

### 5. Deployment (Streamlit Cloud)

1. Push the project to a public GitHub repository
2. Go to https://streamlit.io/cloud and sign in
3. Click New App
4. Select:
  4.1. Repository
  4.2. Branch (e.g., main)
  4.3. Entry file: sat_scraper_app.py
8. Add the API key under Settings → Secrets
9. Click Deploy
The application will be live at:
https://<username>-<repo-name>.streamlit.app



# Python Code for YouTube Influencer list extractor
```python
import streamlit as st
from googleapiclient.discovery import build
import pandas as pd
import os
API_KEY = os.getenv("API_KEY")
---- CONFIG ----
#API_KEY = ''   <-- Replace with your actual API key
youtube = build('youtube', 'v3', developerKey=API_KEY)

#---- FUNCTIONS ----
def search_channels(query, max_results=500):
    request = youtube.search().list(
        q=query,
        type='video',
        part='snippet',
        maxResults=max_results
    )
    response = request.execute()
    return response['items']

def get_channel_stats(channel_id):
    request = youtube.channels().list(
        part='statistics,snippet',
        id=channel_id
    )
    response = request.execute()
    if response['items']:
        stats = response['items'][0]
        return {
            'Channel Name': stats['snippet']['title'],
            'Channel ID': channel_id,
            'Subscribers': int(stats['statistics'].get('subscriberCount', 0)),
            'Video Count': stats['statistics'].get('videoCount', 'N/A'),
            'Description': stats['snippet'].get('description', ''),
            'URL': f"https://www.youtube.com/channel/{channel_id}"
        }
    return {}

 #---- STREAMLIT UI ----
st.title("🎓 YouTube Influencer Finder")

search_query = st.text_input("Search Keyword", value="SAT prep")
max_subs = st.slider("Max Subscriber Count", min_value=100, max_value=500000, value=250000, step=1000)
run_search = st.button("Search YouTube Influencers")

if run_search:
    with st.spinner("Searching..."):
        results = search_channels(search_query)
        influencer_data = []

        for item in results:
            channel_id = item['snippet']['channelId']
            stats = get_channel_stats(channel_id)
            if 100 <= stats.get('Subscribers', 0) <= max_subs:
                influencer_data.append(stats)

        if influencer_data:
            df = pd.DataFrame(influencer_data)
            st.success(f"Found {len(df)} influencers.")
            st.dataframe(df)
            csv = df.to_csv(index=False).encode('utf-8')
            st.download_button("Download CSV", csv, "youtube_influencers.csv", "text/csv")
        else:
            st.warning("No influencers found in that range.")
```

### Built by Satyarth
#### For questions or collaborations, reach out at jaiswal.satyarth070@gmail.com
