# 🐠 Fish Disease Detection App — Complete Startup & Free Deployment Guide

> **Last Updated**: March 2026  
> **Tech Stack**: React 19 + Vite 7 (Frontend) | Node.js + Express 5 (Backend) | Python Flask + YOLOv8 (ML Service) | Supabase (Database + Auth + Storage)

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Part 1: Local Development Setup](#-part-1-local-development-setup-step-by-step)
3. [Part 2: Free Deployment for Global Access](#-part-2-free-deployment-for-global-access)
4. [Troubleshooting](#-troubleshooting)
5. [Free Resource Summary](#-free-resource-summary)

---

## 🛠 Prerequisites

Install these on your machine **before** starting:

| Tool | Version | Download Link | Check Command |
|------|---------|---------------|---------------|
| **Node.js** | 18+ (LTS recommended) | [nodejs.org](https://nodejs.org/) | `node --version` |
| **npm** | Comes with Node.js | — | `npm --version` |
| **Python** | 3.8+ | [python.org](https://www.python.org/downloads/) | `python --version` |
| **pip** | Comes with Python | — | `pip --version` |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | `git --version` |

> [!IMPORTANT]
> When installing Python on Windows, **check "Add Python to PATH"** during installation.

---

## 🚀 Part 1: Local Development Setup (Step by Step)

Your project has **3 services** that must all be running simultaneously:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend        │────▶│  Backend         │────▶│  ML Service      │
│  localhost:5173  │     │  localhost:5000   │     │  localhost:5001   │
│  React + Vite    │     │  Express + Node   │     │  Flask + YOLOv8   │
└─────────────────┘     └────────┬──────────┘     └─────────────────┘
                                 │
                        ┌────────▼──────────┐
                        │   Supabase Cloud   │
                        │  (Database + Auth) │
                        └───────────────────┘
```

---

### Step 1: Supabase Setup (Database & Auth) — FREE

1. **Create Account**: Go to [supabase.com](https://supabase.com) → Sign up (free)
2. **Create New Project**:
   - Click **"New Project"**
   - Choose your organization
   - Set a **Project Name** (e.g., `fish-disease-detection`)
   - Set a **Database Password** (save this!)
   - Choose **Region** closest to you
   - Click **"Create new project"** and wait ~2 minutes

3. **Run Database Schema**:
   - Go to **SQL Editor** (left sidebar)
   - Click **"New Query"**
   - Copy-paste the entire contents of `database/schema.sql` into the editor
   - Click **"Run"** (or press Ctrl+Enter)
   - You should see "Success" messages

4. **Verify Storage Bucket**:
   - Go to **Storage** (left sidebar)
   - You should see a `fish-images` bucket created
   - If not, click **"New Bucket"** → name it `fish-images` → set as **Public** → Create

5. **Enable Email Signups** (IMPORTANT!):
   - Go to **Authentication** → **Providers**
   - Make sure **Email** provider is **Enabled**
   - Go to **Authentication** → **Settings**
   - Under **"Email Auth"**, disable **"Confirm Email"** (for development ease)

6. **Get Your API Keys**:
   - Go to **Settings** → **API** (left sidebar under Configuration)
   - Copy these two values:
     - **Project URL** (looks like `https://xxxxx.supabase.co`)
     - **anon/public key** (long JWT string starting with `eyJ...`)

---

### Step 2: Backend Setup (Node.js API Server)

Open **Terminal 1** (PowerShell/CMD):

```powershell
# Navigate to backend folder
cd "d:\7Th Sem project\Final_Year_Project_App\Fish_Disease_Detection_App\backend"

# Install Node.js dependencies
npm install

# Create/Edit the .env file with your Supabase credentials
# Open .env in notepad/VS Code and set these values:
```

**Edit `backend/.env`** with these values:
```env
PORT=5000
NODE_ENV=development

# Paste YOUR Supabase credentials here
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# ML Service URL (keep as-is for local dev)
ML_SERVICE_URL=http://localhost:5001

# Frontend URL (keep as-is for local dev)
FRONTEND_URL=http://localhost:5173
```

```powershell
# Start the backend server
npm run dev
```

✅ **Expected Output**: `🚀 Backend server running on http://localhost:5000`

---

### Step 3: ML Service Setup (Python + YOLOv8 Models)

Open **Terminal 2** (new PowerShell/CMD window):

```powershell
# Navigate to ml-service folder
cd "d:\7Th Sem project\Final_Year_Project_App\Fish_Disease_Detection_App\ml-service"

# Option A: Use the batch script (easy way)
setup_venv.bat

# Option B: Manual setup
python -m venv venv
venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

> [!WARNING]
> **PyTorch + Ultralytics are large packages (~2-3 GB)**. The install may take 10-20 minutes depending on your internet speed.

**Verify your `.env` file** (`ml-service/.env`):
```env
PORT=5001
FISH_MODEL_1=models/fish_detection_1/fish_detection_run.pt
FISH_MODEL_2=models/fish_detection_2/indian_freshwater_fish.pt
FISH_MODEL_3=models/fish_detection_3/marine_fish_detection.pt
FISH_MODEL_4=models/fish_detection_4/marine_fish_species.pt
DISEASE_MODEL=models/disease_detection/best.pt
```

```powershell
# Make sure venv is activated, then start the ML service
venv\Scripts\activate
python app.py
```

✅ **Expected Output**:
```
🚀 ML Service starting on http://localhost:5001
📊 Loading models...
✅ All models loaded successfully!
🔬 Ready to process detections
```

> [!NOTE]
> Make sure all 5 `.pt` model files exist inside `ml-service/models/` subdirectories. Without them, the ML service will fail to start.

---

### Step 4: Frontend Setup (React App)

Open **Terminal 3** (new PowerShell/CMD window):

```powershell
# Navigate to frontend folder
cd "d:\7Th Sem project\Final_Year_Project_App\Fish_Disease_Detection_App\frontend"

# Install Node.js dependencies
npm install
```

**Edit `frontend/.env`** with your Supabase credentials:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Backend API URL (keep as-is for local dev)
VITE_API_URL=http://localhost:5000
```

```powershell
# Start the frontend dev server
npm run dev
```

✅ **Expected Output**: `Local: http://localhost:5173/`

---

### Step 5: Test Everything! 🎉

1. Open your browser → Go to **http://localhost:5173**
2. **Register** a new account (email + password)
3. **Login** with your new account
4. Click **"New Session"** in the sidebar
5. Go to **Fish Detection** tab → Upload a fish image → See results!
6. Go to **Disease Detection** tab → Upload a fish image → See disease analysis!

> [!TIP]
> **Quick checklist — All 3 terminals should show**:
> - Terminal 1 (Backend): `🚀 Backend server running on http://localhost:5000`
> - Terminal 2 (ML Service): `✅ All models loaded successfully!`
> - Terminal 3 (Frontend): `Local: http://localhost:5173/`

---

## 🌍 Part 2: Free Deployment for Global Access

Here's how to deploy your app so **anyone in the world** can access it — using **100% free resources**.

### Deployment Architecture

```
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│  Vercel (FREE)     │───▶│  Render (FREE)     │───▶│  Render (FREE)     │
│  Frontend          │    │  Backend API       │    │  ML Service        │
│  React + Vite      │    │  Node.js + Express │    │  Flask + YOLOv8    │
│  vercel.com        │    │  render.com        │    │  render.com        │
└────────────────────┘    └────────┬───────────┘    └────────────────────┘
                                   │
                          ┌────────▼───────────┐
                          │  Supabase (FREE)   │
                          │  Already set up!   │
                          └────────────────────┘
```

| Service | Platform | Free Tier Limits | Cost |
|---------|----------|-----------------|------|
| Frontend | **Vercel** | 100 GB bandwidth/month, auto-deploy from Git | $0 |
| Backend API | **Render** | 750 hrs/month, auto-sleep after 15 min inactivity | $0 |
| ML Service | **Render** | 750 hrs/month, 512 MB RAM (see note below) | $0 |
| Database + Auth + Storage | **Supabase** | 500 MB database, 1 GB storage, 50k auth users | $0 |

> [!CAUTION]
> **ML Service Limitation**: The free tier on Render has **512 MB RAM**. YOLOv8 models with PyTorch may **exceed** this.
> **Solutions** (see below):
> - Use **Hugging Face Spaces** (free, 16 GB RAM with CPU) — **RECOMMENDED**
> - Or optimize models with ONNX Runtime to reduce memory

---

### Option A: Deploy Frontend on Vercel (RECOMMENDED) — FREE

**Why Vercel?** Best-in-class for React/Vite apps, instant deploys, global CDN.

1. **Push your code to GitHub**:
   ```powershell
   # From the project root
   cd "d:\7Th Sem project\Final_Year_Project_App\Fish_Disease_Detection_App"
   git init
   git add .
   git commit -m "Initial commit"
   
   # Create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/fish-disease-detection.git
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com) → Sign up with GitHub (free)
   - Click **"Add New Project"** → Import your GitHub repository
   - Set **Root Directory** to `frontend`
   - Set **Framework Preset** to **Vite**
   - Add **Environment Variables**:
     | Key | Value |
     |-----|-------|
     | `VITE_SUPABASE_URL` | Your Supabase project URL |
     | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
     | `VITE_API_URL` | Your Render backend URL (set after backend deploy) |
   - Click **Deploy**

3. **Get your frontend URL**: After deploy, you'll get a URL like `https://fish-disease-detection.vercel.app`

---

### Option B: Deploy Backend on Render — FREE

1. Go to [render.com](https://render.com) → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your **GitHub repo**
4. Configure the service:
   | Setting | Value |
   |---------|-------|
   | **Name** | `fish-disease-backend` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | `Free` |

5. Add **Environment Variables** on Render:
   | Key | Value |
   |-----|-------|
   | `PORT` | `5000` |
   | `NODE_ENV` | `production` |
   | `VITE_SUPABASE_URL` | Your Supabase URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `ML_SERVICE_URL` | Your ML service URL (set after ML deploy) |
   | `FRONTEND_URL` | Your Vercel frontend URL |

6. Click **"Create Web Service"**
7. **Get your backend URL**: Something like `https://fish-disease-backend.onrender.com`

> [!NOTE]
> **Update your Vercel frontend** `VITE_API_URL` environment variable to this Render backend URL, then redeploy.

---

### Option C: Deploy ML Service on Hugging Face Spaces — FREE (RECOMMENDED)

**Why Hugging Face?** It gives you **16 GB RAM for free** with CPU — perfect for YOLOv8 models!

1. Go to [huggingface.co](https://huggingface.co) → Sign up (free)
2. Click **"New Space"** → Name it `fish-disease-ml`
3. Choose **SDK**: `Docker`
4. Choose **Hardware**: `CPU Basic` (free, 16 GB RAM)

5. **Create a `Dockerfile`** in your `ml-service/` folder:
   ```dockerfile
   FROM python:3.10-slim

   WORKDIR /app

   # Install system dependencies for OpenCV
   RUN apt-get update && apt-get install -y \
       libgl1-mesa-glx \
       libglib2.0-0 \
       && rm -rf /var/lib/apt/lists/*

   # Copy and install Python dependencies
   COPY requirements.txt .
   RUN pip install --no-cache-dir --upgrade pip && \
       pip install --no-cache-dir -r requirements.txt

   # Copy application code
   COPY . .

   # Expose port (Hugging Face uses port 7860)
   EXPOSE 7860

   # Run the app on port 7860 for Hugging Face
   CMD ["python", "-c", "import os; os.environ['PORT']='7860'; exec(open('app.py').read())"]
   ```

6. **Upload your model files and code** to the Hugging Face Space:
   ```powershell
   # Install HF CLI
   pip install huggingface_hub

   # Login
   huggingface-cli login

   # Clone your space
   git clone https://huggingface.co/spaces/YOUR_USERNAME/fish-disease-ml
   
   # Copy your ml-service files into it
   # Copy models/, src/, app.py, requirements.txt, Dockerfile, .env
   
   # Push
   cd fish-disease-ml
   git add .
   git commit -m "Deploy ML service"
   git push
   ```

7. **Your ML service URL**: `https://YOUR_USERNAME-fish-disease-ml.hf.space`
8. **Update Render backend** `ML_SERVICE_URL` to this Hugging Face URL

---

### Alternative: Deploy ML Service on Render — FREE (Simpler but Limited RAM)

If your models are small enough (< 512 MB total):

1. On [render.com](https://render.com) → **"New +"** → **"Web Service"**
2. Configure:
   | Setting | Value |
   |---------|-------|
   | **Name** | `fish-disease-ml` |
   | **Root Directory** | `ml-service` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `python app.py` |
   | **Instance Type** | `Free` |

3. Add environment variables (same as your `ml-service/.env`)
4. **Upload model files**: Render pulls from Git, so your `.pt` files must be in the repo (or use Git LFS for large files)

---

### Option D: Alternative Free Platforms

| Platform | Best For | Free Tier | Link |
|----------|----------|-----------|------|
| **Vercel** | Frontend (React/Vite) | 100 GB bandwidth, unlimited deploys | [vercel.com](https://vercel.com) |
| **Netlify** | Frontend (alternative) | 100 GB bandwidth, 300 build min/month | [netlify.com](https://www.netlify.com) |
| **Render** | Backend (Node.js) | 750 hrs/month, auto-sleep | [render.com](https://render.com) |
| **Railway** | Backend (alternative) | $5 free credit/month (~500 hrs) | [railway.app](https://railway.app) |
| **Hugging Face Spaces** | ML Service (Python) | 16 GB RAM CPU, unlimited | [huggingface.co/spaces](https://huggingface.co/spaces) |
| **Google Colab** | ML (alternative/testing) | Free GPU, notebook-based | [colab.research.google.com](https://colab.research.google.com) |
| **Supabase** | Database + Auth + Storage | 500 MB DB, 1 GB storage | [supabase.com](https://supabase.com) |
| **GitHub** | Code hosting + CI/CD | Unlimited public repos, Actions | [github.com](https://github.com) |

---

### Post-Deployment Checklist

After all services are deployed, update these URLs:

1. **Vercel (Frontend) Env Vars**:
   ```
   VITE_API_URL=https://fish-disease-backend.onrender.com
   ```

2. **Render (Backend) Env Vars**:
   ```
   ML_SERVICE_URL=https://YOUR_USERNAME-fish-disease-ml.hf.space
   FRONTEND_URL=https://fish-disease-detection.vercel.app
   ```

3. **Supabase Dashboard**:
   - Go to **Authentication** → **URL Configuration**
   - Add your Vercel URL to **Redirect URLs**: `https://fish-disease-detection.vercel.app/**`

4. **Test everything**:
   - Visit your Vercel URL
   - Register/Login
   - Upload a fish image
   - Verify detection works end-to-end

---

## 🔧 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `npm install` fails | Delete `node_modules` and `package-lock.json`, then run `npm install` again |
| Python venv won't activate | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` in PowerShell |
| Models not loading | Verify all `.pt` files exist in `ml-service/models/` subdirectories |
| CORS errors in browser | Make sure `FRONTEND_URL` in backend `.env` matches exactly (including `http://` vs `https://`) |
| Supabase auth not working | Ensure "Confirm Email" is disabled in Supabase Auth settings for development |
| `Module not found` in Python | Make sure your virtual environment is activated: `venv\Scripts\activate` |
| Backend can't reach ML service | Make sure ML service is running on port 5001 and `ML_SERVICE_URL` is correct |
| Render service sleeping | Free tier sleeps after 15 min inactivity. First request takes ~30 sec to "wake up" |

### Checking Service Health

```powershell
# Backend health check
curl http://localhost:5000/health

# ML Service health check
curl http://localhost:5001/health
```

---

## 💰 Free Resource Summary

**Total Cost: $0/month** for the complete deployment!

| Resource | Provider | What You Get Free |
|----------|----------|-------------------|
| **Database** | Supabase | 500 MB PostgreSQL, 50k monthly active users |
| **Auth** | Supabase | Unlimited auth users, email/password + OAuth |
| **File Storage** | Supabase | 1 GB storage, 2 GB bandwidth |
| **Frontend Hosting** | Vercel | Unlimited deploys, global CDN, custom domains |
| **Backend Hosting** | Render | 750 hrs/month free, auto-deploy from Git |
| **ML Service Hosting** | Hugging Face Spaces | 16 GB RAM CPU instances, unlimited runtime |
| **Code Hosting** | GitHub | Unlimited public repos, GitHub Actions CI/CD |
| **Domain (optional)** | Freenom / .tk | Free subdomains (or use default URLs) |

> [!TIP]
> **For a college final year project**, these free tiers are **more than enough**. You'll likely never hit the limits with demo/presentation traffic.

---

## 🚀 Quick Start Cheatsheet

```powershell
# ============================================
# OPEN 3 SEPARATE TERMINALS AND RUN THESE:
# ============================================

# --- Terminal 1: Backend ---
cd "d:\7Th Sem project\Final_Year_Project_App\Fish_Disease_Detection_App\backend"
npm install
npm run dev

# --- Terminal 2: ML Service ---
cd "d:\7Th Sem project\Final_Year_Project_App\Fish_Disease_Detection_App\ml-service"
venv\Scripts\activate
python app.py

# --- Terminal 3: Frontend ---
cd "d:\7Th Sem project\Final_Year_Project_App\Fish_Disease_Detection_App\frontend"
npm install
npm run dev

# --- Open Browser ---
# Go to: http://localhost:5173
```

---

**You're all set! 🎉** Your Fish Disease Detection App is now ready for local development and global deployment — all for free!
