# PLAGFLAG - IBM Granite-Powered Plagiarism Analyzer

> Enterprise-grade plagiarism and AI-content detection platform powered by IBM Granite (watsonx.ai).

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** installed
- **Node.js 18+** installed
- Internet connection (for web scraping)

---

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('punkt_tab')"

# Copy and edit environment variables
copy .env.example .env
```

Edit `backend/.env` and fill in your IBM credentials:
```env
IBM_API_KEY=your_actual_ibm_api_key
IBM_PROJECT_ID=your_actual_project_id
IBM_URL=https://us-south.ml.cloud.ibm.com
```

> ⚠️ IBM Granite credentials are **optional**. Without them, the app uses a local heuristic AI detector.

```bash
# Start the backend
python app.py
```
Backend runs at **http://localhost:5000**

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm start
```

Frontend runs at **http://localhost:3000**

---

## 🎯 Features

| Feature | Description |
|---|---|
| **Text Mode** | Paste text directly for instant analysis |
| **PDF Mode** | Upload PDF files (digital & scanned) |
| **DOCX Mode** | Upload Microsoft Word documents |
| **TXT Mode** | Upload plain text files |
| **Folder Mode** | Batch upload — cross-compare all files |
| **Web Scraping** | Live Google & Bing search for source matching |
| **AI Detection** | IBM Granite via watsonx.ai + local fallback |
| **Citations** | Full source URLs with similarity percentages |
| **Cross-file Matrix** | Visual similarity matrix for folder uploads |
| **Verdict Badges** | Original / Low / Moderate / High / AI Generated |

---

## 📊 Verdict Scale

| Verdict | Threshold |
|---|---|
| ✅ Original | < 15% similarity |
| ℹ️ Low Similarity | 15–40% |
| ⚠️ Moderate Plagiarism | 40–70% |
| 🚨 High Plagiarism | ≥ 70% |
| 🤖 AI Generated | Detected by IBM Granite |

---

## 🏗️ Architecture

```
PLAGFLAG/
├── backend/
│   ├── app.py              # Flask API server
│   ├── plagiarism_engine.py # Web scraping + TF-IDF similarity
│   ├── ai_detector.py       # IBM Granite + local heuristics
│   ├── text_extractor.py    # PDF/DOCX/TXT extraction
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js           # Main app + routing + layout
│   │   ├── pages/
│   │   │   ├── HomePage.js  # Dashboard
│   │   │   ├── AnalyzePage.js # Text/File analysis
│   │   │   ├── FolderPage.js  # Batch folder analysis
│   │   │   └── AboutPage.js
│   │   ├── components/
│   │   │   ├── Common.js    # Shared UI components
│   │   │   └── ReportView.js # Full report display
│   │   ├── utils/api.js     # Axios API client
│   │   └── styles/main.css  # IBM-themed styles
│   └── package.json
└── README.md
```

---

## 🔐 IBM Granite Configuration

PLAGFLAG integrates with **IBM Granite 13B Instruct v2** via watsonx.ai for AI content detection.

1. Get your API key at [cloud.ibm.com](https://cloud.ibm.com)
2. Create a watsonx.ai project at [dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
3. Add credentials to `backend/.env`

Without credentials, PLAGFLAG automatically falls back to a local heuristic detector that analyzes:
- Transitional phrase frequency
- Sentence length uniformity
- Contraction usage
- Passive voice ratio
- Paragraph structure uniformity
- Vocabulary diversity

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/analyze/text` | Analyze plain text |
| POST | `/api/analyze/file` | Analyze single file |
| POST | `/api/analyze/folder` | Analyze multiple files |
