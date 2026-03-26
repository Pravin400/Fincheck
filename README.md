# 🐠 Fish Disease Detection Application

An AI-powered full-stack application for detecting fish species and diseases using ensemble learning with YOLOv8 models. Features user authentication, session history management, and real-time detection results.

## 🌟 Features

- **Ensemble Fish Detection**: 4 specialized YOLOv8 models working together for accurate species identification
- **Disease Detection**: Trained model to identify fish diseases with severity levels and treatment recommendations
- **User Authentication**: Secure login/registration with Supabase Auth
- **Session History**: ChatGPT-style sidebar to track all detection sessions
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **Cloud Storage**: Images stored securely in Supabase Storage

## 📁 Project Structure

```
Fish_Disease_Detection_App/
├── frontend/          # React + Vite frontend
├── backend/           # Node.js + Express API
├── ml-service/        # Python Flask ML service
└── database/          # Supabase schema
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Supabase account (free tier works)

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `database/schema.sql`
3. Go to **Storage** and verify the `fish-images` bucket was created
4. Copy your project URL and anon key from **Settings > API**

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Edit .env and add your Supabase credentials:
# SUPABASE_URL=your_project_url
# SUPABASE_ANON_KEY=your_anon_key

# Start development server
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit .env and add your Supabase credentials:
# VITE_SUPABASE_URL=your_project_url
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. ML Service Setup

```bash
cd ml-service

# Create virtual environment and install dependencies
# On Windows:
setup_venv.bat

# On Linux/Mac:
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start ML service
python app.py
```

ML service will run on `http://localhost:5001`

## 🎯 Usage

1. **Register/Login**: Create an account or login at the landing page
2. **Create Session**: Click "New Session" in the sidebar
3. **Upload Image**: Choose between Fish Detection or Disease Detection tab
4. **Get Results**: Upload an image and view AI-powered detection results
5. **View History**: Access past detections from the session sidebar

## 🏗️ Architecture

### Frontend (React + Vite)
- **Pages**: Landing, Login, Register, Dashboard
- **Components**: SessionHistory, FishDetection, DiseaseDetection
- **State**: React Context API for authentication
- **Styling**: Tailwind CSS with custom gradients

### Backend (Node.js + Express)
- **Auth Routes**: User registration, login, logout
- **Session Routes**: CRUD operations for detection sessions
- **Detection Routes**: Proxy to ML service with image upload
- **Database**: Supabase PostgreSQL with RLS

### ML Service (Python + Flask)
- **Fish Detection**: Ensemble of 4 YOLOv8 models with majority voting
- **Disease Detection**: Single YOLOv8 model with disease classification
- **Models**: Pre-trained .pt files in `ml-service/models/`

## 📊 API Endpoints

### Backend API (Port 5000)

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/user` - Get current user

**Sessions**
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - Get all user sessions
- `GET /api/sessions/:id` - Get session details
- `DELETE /api/sessions/:id` - Delete session
- `PATCH /api/sessions/:id` - Update session title

**Detection**
- `POST /api/detect/fish` - Fish species detection
- `POST /api/detect/disease` - Disease detection

### ML Service API (Port 5001)

- `GET /health` - Health check
- `POST /api/detect/fish` - Fish detection (ensemble)
- `POST /api/detect/disease` - Disease detection

## 🔧 Environment Variables

### Backend (.env)
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
ML_SERVICE_URL=http://localhost:5001
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000
```

### ML Service (.env)
```env
PORT=5001
FISH_MODEL_1=models/fish_detection_1/fish_detection_run.pt
FISH_MODEL_2=models/fish_detection_2/indian_freshwater_fish.pt
FISH_MODEL_3=models/fish_detection_3/marine_fish_detection.pt
FISH_MODEL_4=models/fish_detection_4/marine_fish_species.pt
DISEASE_MODEL=models/disease_detection/best.pt
```

## 🤖 Models

The application uses 5 YOLOv8 models:

**Fish Detection (Ensemble)**
1. `fish_detection_run.pt` - General fish detection
2. `indian_freshwater_fish.pt` - Indian freshwater species
3. `marine_fish_detection.pt` - Marine fish detection
4. `marine_fish_species.pt` - Marine species classification

**Disease Detection**
1. `best.pt` - Fish disease classification

## 📝 License

This project is for educational purposes.

## 👥 Contributors

- Your Name

## 🙏 Acknowledgments

- YOLOv8 by Ultralytics
- Supabase for backend services
- React and Vite teams
