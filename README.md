# UI → Code Generator

Turn UI screenshots into React components with Tailwind CSS. Upload an image, call a vision model (Gemini by default), and preview the generated code live in the browser.

## Features

- **Image upload** with drag-and-drop and thumbnail preview
- **FastAPI backend** that sends the image to Gemini (or OpenAI) and returns cleaned JSX
- **React + Vite + Tailwind** frontend with **Sandpack** live preview and optional full-screen / resizable panels

## Tech stack

| Area | Stack |
|------|--------|
| Frontend | React 18, Vite 5, Tailwind CSS, Sandpack, Lucide icons |
| Backend | Python 3, FastAPI, Uvicorn, python-multipart, python-dotenv |

## Project structure

```
├── client/          # React app (Vite)
│   ├── src/
│   └── package.json
├── server/          # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── services/ai_service.py
│   │   └── utils/parser.py
│   ├── requirements.txt
│   └── .env         # not committed; create locally
└── README.md
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- A **Gemini API key** ([Google AI Studio](https://aistudio.google.com/)) placed in `server/.env`

## Backend setup

From the repository root:

```bash
cd server
python -m venv .venv
```

Activate the virtual environment:

- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source .venv/bin/activate`

Install dependencies and run the API:

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API listens at **http://127.0.0.1:8000** (or `http://localhost:8000`).

### Environment variables (`server/.env`)

Create `server/.env` (do not commit real keys):

```env
GEMINI_API_KEY=your_key_here
MODEL_NAME=gemini-2.5-flash
```

Optional: use OpenAI instead by setting `OPENAI_API_KEY` and installing the `openai` package as listed in `requirements.txt` (see `ai_service.py` for behavior).

### API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check: `{"status":"ok"}` |
| `POST` | `/api/generate` | Multipart form: field name **`file`** (image). Returns `{"code": "<jsx string>"}` |

**Example (curl):**

```bash
curl -X POST "http://localhost:8000/api/generate" -F "file=@./screenshot.png"
```

CORS is enabled for `http://localhost:3000` and `http://localhost:5173`.

## Frontend setup

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. The app posts images to `http://localhost:8000/api/generate`; keep the backend running in parallel.

**Production build:**

```bash
npm run build
npm run preview
```

## Troubleshooting

- **503 from Gemini (“high demand”)**  
  The backend retries transient 503s. If it persists, wait a short time and try again, or adjust `MODEL_NAME` in `server/.env`.

- **`ModuleNotFoundError` or wrong Python**  
  Always install packages and run Uvicorn with the **same** interpreter, for example: `python -m pip install -r requirements.txt` and `python -m uvicorn app.main:app --reload`.

- **CORS errors**  
  Serve the frontend from `localhost:5173` or `localhost:3000`, or add your origin in `server/app/main.py` under `CORSMiddleware`.

## License

Use and modify this project according to your needs. Add a `LICENSE` file if you publish the repo publicly.
