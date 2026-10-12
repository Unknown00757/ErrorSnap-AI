# ErrorSnap AI 🔍

**A beginner-friendly AI tool that explains error screenshots in plain English.**

Upload a screenshot of any error, and ErrorSnap AI will:
- Explain what went wrong in simple terms
- Give you 3 clear troubleshooting steps
- Offer a "Show Me the Fix" mode with actionable code/config guidance

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React + Vite + JavaScript         |
| Backend  | Python + Flask                    |
| AI Model | Gemma 4 via Google Gemini API     |

---

## Project Structure

```
ErrorSnap-AI/
├── frontend/          ← React + Vite app
│   └── src/
│       ├── components/    ← UI building blocks
│       ├── pages/         ← Page-level views
│       └── services/      ← API communication layer
├── backend/           ← Python + Flask API
│   ├── app/
│   │   ├── routes/        ← HTTP endpoint definitions
│   │   └── services/      ← AI + business logic
│   └── uploads/           ← Temporary screenshot storage
├── .gitignore
└── README.md
```

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # then fill in your API key
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

See `backend/.env.example` for required variables.  
**Never commit your `.env` file.**

---

## Roadmap

- [x] Project structure
- [ ] Screenshot upload UI
- [ ] Flask upload endpoint
- [ ] Gemma 4 AI integration (Gemini API)
- [ ] Beginner-friendly explanation display
- [ ] Troubleshooting steps panel
- [ ] "Show Me the Fix" mode
