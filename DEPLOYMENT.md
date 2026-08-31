# 🚀 Deployment Guide — RevGuard-AI

RevGuard-AI is engineered with a **unified production architecture**. The FastAPI backend directly serves the pre-compiled React 18 frontend Single Page Application (SPA), allowing the entire full-stack platform to run as a single ultra-fast web service.

---

## ⚡ Option 1: 1-Click Vercel Deployment (Zero Cold Starts & Instant Global CDN)

RevGuard-AI includes native **Vercel Full-Stack Serverless** configuration via [`vercel.json`](vercel.json) and [`api/index.py`](api/index.py).

1. Sign in to **[Vercel.com](https://vercel.com)**.
2. Click **Add New...** $\rightarrow$ **Project** $\rightarrow$ Import your `RevGuard-AI` repository.
3. Keep the **Root Directory** as `./` (default). Vercel will automatically read `vercel.json`:
   - Builds the React 18 TypeScript frontend into global Edge CDN.
   - Deploys the FastAPI backend as Serverless Python functions under `/api/*`.
4. Click **Deploy**.
5. Your live app will be active in seconds at: `https://revguard-ai.vercel.app` (with **0ms cold start**).

---

## 🌟 Option 2: 1-Click Render.com Deployment (Docker)

1. Push your repository to GitHub: `https://github.com/durgasnv/RevGuard-AI`
2. Sign in to [Render.com](https://render.com).
3. Click **New +** $\rightarrow$ **Web Service** $\rightarrow$ **Build and deploy from a Git repository**.
4. Select your `RevGuard-AI` repository.
5. Render will automatically detect the `Dockerfile` and `render.yaml`:
   - **Environment:** `Docker`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/health`
6. Click **Create Web Service**.
7. In ~2 minutes, your live URL will be active at:  
   `https://revguard-ai.onrender.com`

---

## 🚂 Option 3: 1-Click Railway Deployment

1. Sign in to [Railway.app](https://railway.app).
2. Click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Select `RevGuard-AI`.
4. Railway will automatically detect `railway.json` and build the multi-stage Docker container.
5. Under Settings $\rightarrow$ **Generate Domain**.
6. Your live URL is ready!

---

## 🐳 Option 3: Docker Container (Any Cloud / VPS / Local)

To build and run the full-stack container locally or on any cloud VPS (DigitalOcean, AWS EC2, GCP):

```bash
# Build the multi-stage image
docker build -t revguard-ai:latest .

# Run container on port 8000
docker run -d -p 8000:8000 --name revguard revguard-ai:latest
```

Or using Docker Compose:
```bash
docker compose up -d
```
Visit **`http://localhost:8000`** in your browser.

---

## ✈️ Option 4: Fly.io Deployment

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch --name revguard-ai --region sin

# Deploy
fly deploy
```

---

## 🌐 Option 5: Decoupled Deployment (Vercel + Backend on Render/Railway)

If you prefer hosting the React frontend on **Vercel** and the FastAPI backend on **Render/Railway**:

### 1. Deploy Backend (FastAPI)
- Deploy the `/backend` folder to Render/Railway.
- Note your backend URL (e.g. `https://revguard-api.onrender.com`).

### 2. Deploy Frontend (Vercel)
- Import the repo in Vercel with **Root Directory** set to `frontend`.
- Set Environment Variable in Vercel:
  ```env
  VITE_API_URL=https://revguard-api.onrender.com
  ```
- Deploy!

---

## 🛡️ Health Check Verification

Once deployed, verify your service status:
```bash
curl https://<your-deployed-url>/health
# Output: {"status":"ok","transactions_in_store":0}
```
Visiting `https://<your-deployed-url>/` in your browser will launch the full RevGuard-AI Control Tower!
