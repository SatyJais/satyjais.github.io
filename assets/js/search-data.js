// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "About",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-projects",
          title: "Projects",
          description: "Automating Intelligence Across Marketing &amp; Product",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-certifications",
          title: "Certifications",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/certifications/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "News",},{id: "news-a-long-announcement-with-details",
          title: 'A long announcement with details',
          description: "",
          section: "News",handler: () => {
              window.location.href = "/news/announcement_2/";
            },},{id: "news-a-simple-inline-announcement-with-markdown-emoji-sparkles-smile",
          title: 'A simple inline announcement with Markdown emoji! :sparkles: :smile:',
          description: "",
          section: "News",},{id: "projects-project-5",
          title: 'project 5',
          description: "a project with a background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_project/";
            },},{id: "projects-project-6",
          title: 'project 6',
          description: "a project with no image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/6_project/";
            },},{id: "projects-digital-advertising-data-pipeline-amp-dashboard",
          title: 'Digital Advertising Data Pipeline &amp;amp; Dashboard',
          description: "ETL pipeline and dashboarding for Google &amp; Meta Ads using Google BigQuery(SQL) &amp; Looker Studio",
          section: "Projects",handler: () => {
              window.location.href = "/projects/BQ_Looker_Dashboard/";
            },},{id: "projects-bigquery-amp-sheets-live-dashboard",
          title: 'BigQuery &amp;amp; Sheets Live Dashboard',
          description: "Streamlined campaign reporting workflow to improve accuracy, reduce manual effort, and enable faster decisions.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/Data_Cleaning_ETL_BigQuery_GSheets/";
            },},{id: "projects-keyword-based-influencer-discovery",
          title: 'Keyword-Based Influencer Discovery',
          description: "keyword-driven influencer discovery application using Python &amp; Streamlit",
          section: "Projects",handler: () => {
              window.location.href = "/projects/Keyword_driven_influencer_discovery/";
            },},{id: "projects-ocr-amp-ai-powered-note-processing-pipeline",
          title: 'OCR &amp;amp; AI-Powered Note Processing Pipeline',
          description: "Automated pipeline to extract, rephrase, and reformat 20,000+ pages of handwritten care notes using Tesseract OCR, GPT-4o, and Python — built in 3 days for a US NGO",
          section: "Projects",handler: () => {
              window.location.href = "/projects/PdfProcessingPipeline/";
            },},{id: "projects-marketing-analytics-pipeline",
          title: 'Marketing Analytics Pipeline',
          description: "End-to-end ELT pipeline and real-time dashboard for a US Senior Living Marketplace — integrating Google Ads, Meta Ads &amp; CRM data via BigQuery, dbt &amp; Looker Studio",
          section: "Projects",handler: () => {
              window.location.href = "/projects/digital_Ads_performance_Dashboard/";
            },},{id: "teachings-data-science-fundamentals",
          title: 'Data Science Fundamentals',
          description: "This course covers the foundational aspects of data science, including data collection, cleaning, analysis, and visualization. Students will learn practical skills for working with real-world datasets.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/data-science-fundamentals/";
            },},{id: "teachings-introduction-to-machine-learning",
          title: 'Introduction to Machine Learning',
          description: "This course provides an introduction to machine learning concepts, algorithms, and applications. Students will learn about supervised and unsupervised learning, model evaluation, and practical implementations.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/introduction-to-machine-learning/";
            },},{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
