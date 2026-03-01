# MuleShield AI

## Objective
Build a cross-channel mule account detection system that identifies suspicious financial networks using fraud rules, risk scoring, graph analytics, and explainable alerts.

## Implemented Architecture

### Backend and Intelligence Layer
- FastAPI service at `backend/app/main.py`
- MongoDB persistence (automatic fallback to in-memory storage if Mongo is unavailable)
- Scikit-learn `IsolationForest` for anomaly-assisted risk boosts
- NetworkX directed graph analytics for centrality and cycle detection
- Uvicorn ASGI runtime
- RBAC via `X-Role` request header: `viewer`, `analyst`, `admin`

### Frontend and Infrastructure
- React dashboard (Vite)
- Risk distribution and monitoring views
- Network topology monitoring view
- Account-level intelligence table
- Role selector in UI to test RBAC behavior

## Detection Logic

### Transaction Risk Rules (0-100)
- Amount `> 50,000` -> `+60`
- More than `3` previous sender transactions -> `+40`
- Sender to `3+` unique receivers -> `+20`
- Circular transfer pattern (A->B and B->A) -> `+30`
- Cross-channel burst (`3+` channels) -> `+15`
- Score capped at `100`
- `>= 60` classified as high risk

### ML and Network Intelligence
- ML anomaly score derived from transaction amount + time behavior
- High anomaly raises transaction risk
- Account risk score combines:
- linked high-risk transactions
- fan-out/fan-in network patterns
- cross-channel behavior
- cycle participation
- graph centrality

## API Endpoints

All API routes are served by FastAPI:
- `GET /health`
- `GET /api/transactions`
- `GET /api/risk-analysis`
- `GET /api/alerts`
- `GET /api/graph`
- `GET /api/accounts/risk`
- `POST /api/simulate` (`analyst` or `admin`)

## RBAC

Role is passed in header:
- `X-Role: viewer`
- `X-Role: analyst`
- `X-Role: admin`

Permissions:
- `viewer`: read-only endpoints
- `analyst`: read + simulate transactions
- `admin`: full access (same as analyst for current APIs)

## Run Locally

### 1) Frontend setup
```bash
npm install
```

### 2) Backend setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3) Frontend run (new default)
```bash
npm run dev
```

Vite proxies `/api` to FastAPI at `http://127.0.0.1:8000`.

## Environment Files
- Frontend env template: `.env.example`
- Backend env template: `backend/.env.example`
