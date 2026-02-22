# Video Summarizer

A full-stack web application that generates AI-powered narrative summaries of videos. Upload a video file or provide a YouTube URL, and the app produces a structured summary with timestamps, key moments, and notable elements. Summaries can be exported as PDF reports.

## Architecture

- **Frontend** -- React 18, Tailwind CSS, Vite
- **Backend** -- Python / FastAPI, Google Gemini API (`google-genai`), yt-dlp, WeasyPrint, FFmpeg

## Prerequisites

- Python 3.9+
- Node.js 18+ and npm
- FFmpeg (`brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Debian/Ubuntu)
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

## Quick Setup

An automated setup script handles both backend and frontend:

```bash
chmod +x setup.sh
./setup.sh
```

Then add your API key to `backend/.env`:

```
GOOGLE_API_KEY=your_key_here
```

### Manual Setup

**Backend:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then edit .env to set GOOGLE_API_KEY
```

**Frontend:**

```bash
cd frontend
npm install
```

## Running

Start the backend and frontend in separate terminals:

```bash
# Terminal 1 -- backend (http://localhost:8000)
cd backend
source venv/bin/activate
python main.py

# Terminal 2 -- frontend (http://localhost:3000)
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## Usage

1. Choose **Upload Video** (MP4, AVI, MOV, MKV, WebM; max 2 GB) or **YouTube URL**.
2. The AI analysis streams in real time on the right panel; the video preview appears on the left.
3. Once complete, click **Download PDF** to export a formatted report.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Health check |
| `POST` | `/api/analyze/upload` | Analyze an uploaded video file (multipart form) |
| `POST` | `/api/analyze/youtube` | Analyze a video by YouTube URL (JSON body) |
| `POST` | `/api/generate-pdf` | Generate a PDF report from a summary |

## Project Structure

```
video_summarizer/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── services/
│   │   ├── gemini_service.py    # Gemini API integration
│   │   ├── youtube_service.py   # YouTube download via yt-dlp
│   │   ├── pdf_service.py       # PDF generation (WeasyPrint)
│   │   ├── pdf_service_simple.py
│   │   └── screenshot_service.py
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response models
│   └── utils/
│       └── video_processing.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── VideoInput.jsx
│       │   ├── VideoPlayer.jsx
│       │   ├── SummaryPanel.jsx
│       │   ├── PDFDownload.jsx
│       │   └── LoadingSpinner.jsx
│       └── api/
│           └── client.js
├── setup.sh
└── CHANGELOG.md
```

## Configuration

Key environment variables in `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_API_KEY` | *(required)* | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash-exp` | Model to use (`gemini-2.0-flash-exp`, `gemini-2.5-pro`, etc.) |
| `MAX_FILE_SIZE` | `2147483648` | Maximum upload size in bytes (2 GB) |

## Troubleshooting

- **"GOOGLE_API_KEY not found"** -- Create or edit `backend/.env` and set the key.
- **FFmpeg errors** -- Ensure FFmpeg is installed and on your PATH.
- **"Node command not found"** -- Install Node.js 18+ from https://nodejs.org/.
- **Cannot connect to backend** -- Verify the backend is running on port 8000. Try http://localhost:8000/api/health as a quick check. If you changed the default URL, update `VITE_API_URL` in `frontend/.env`.
- **YouTube download failures** -- Run `pip install --upgrade yt-dlp` and `yt-dlp --rm-cache-dir`. Some age-restricted or private videos cannot be downloaded. See [YOUTUBE_TROUBLESHOOTING.md](YOUTUBE_TROUBLESHOOTING.md) for more detail.

## Building for Production

```bash
# Frontend
cd frontend && npm run build

# Backend (with Gunicorn)
cd backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## License

MIT
