# 🚀 Quick Setup Guide - Fish Disease Detection App

## ✅ What's Already Done

- ✅ Backend running on port 5000
- ✅ Frontend running on port 5173  
- ✅ ML Service running on port 5001 with all 5 models loaded
- ✅ Supabase credentials configured

## ⚠️ What You Need to Do Now

### Step 1: Set Up Database in Supabase (5 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/xcfqezshhygoutemjhfj
   - Login if needed

2. **Run Database Schema**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**
   - Open the file: `database/schema.sql` in your project
   - **Copy ALL the contents** (Ctrl+A, Ctrl+C)
   - **Paste into Supabase SQL Editor**
   - Click **"Run"** (or press Ctrl+Enter)
   - You should see: ✅ "Success. No rows returned"

3. **Verify Tables Created**
   - Click **"Table Editor"** in left sidebar
   - You should see 2 tables:
     - `sessions`
     - `detections`

4. **Verify Storage Bucket**
   - Click **"Storage"** in left sidebar
   - You should see bucket: `fish-images`

### Step 2: Restart Backend

The backend configuration was just fixed. Restart it:

**In your backend terminal:**
- Press `Ctrl+C` to stop
- Run: `npm start`

You should see:
```
🚀 Backend server running on http://localhost:5000
```

### Step 3: Test the Application

1. **Open the app**: http://localhost:5173

2. **Register a new account**:
   - Click "Get Started" or "Register"
   - Email: `test@example.com`
   - Password: `password123`
   - Full Name: `Test User`
   - Click "Create account"

3. **If successful**:
   - You'll be redirected to the Dashboard
   - You'll see the session history sidebar
   - You can create sessions and upload images

4. **If you see errors**:
   - Check that you ran the database schema in Supabase
   - Check that backend restarted successfully
   - Check browser console for error messages

## 🎯 Testing Fish Detection

Once logged in:

1. Click **"New Session"** in sidebar
2. Go to **"Fish Detection"** tab
3. Upload a fish image
4. Click **"🔍 Detect Fish Species"**
5. See results from all 4 models!

## 🏥 Testing Disease Detection

1. Go to **"Disease Detection"** tab
2. Upload a fish image
3. Click **"🔬 Detect Disease"**
4. See disease analysis with recommendations

## 📝 Quick Troubleshooting

**Problem**: Can't register/login
- **Solution**: Run database schema in Supabase SQL Editor

**Problem**: Backend errors
- **Solution**: Restart backend after fixing .env file

**Problem**: Images won't upload
- **Solution**: Check that `fish-images` bucket exists in Supabase Storage

**Problem**: ML detection fails
- **Solution**: Check that ML service is running on port 5001

---

**Need Help?** Check `SUPABASE_SETUP.md` for detailed instructions.
