# Supabase Database Setup Instructions

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project: https://xcfqezshhygoutemjhfj.supabase.co
2. Login to your Supabase account
3. Click on **SQL Editor** in the left sidebar
4. Click **"New Query"** button

## Step 2: Run the Database Schema

Copy the ENTIRE contents of the file `database/schema.sql` and paste it into the SQL Editor, then click **"Run"**.

The schema will create:
- ✅ `sessions` table - for storing detection sessions
- ✅ `detections` table - for storing detection results
- ✅ Row Level Security (RLS) policies - so users can only see their own data
- ✅ `fish-images` storage bucket - for storing uploaded images
- ✅ Storage policies - for secure image access

## Step 3: Verify Setup

After running the schema, verify:

1. **Tables Created**:
   - Go to **Table Editor** in Supabase
   - You should see `sessions` and `detections` tables

2. **Storage Bucket Created**:
   - Go to **Storage** in Supabase
   - You should see `fish-images` bucket

3. **Authentication Enabled**:
   - Go to **Authentication** → **Providers**
   - Ensure **Email** provider is enabled (it should be by default)

## Step 4: Restart Backend

After setting up the database, restart your backend server:

```bash
# Stop the current backend (Ctrl+C in the terminal)
# Then restart:
cd backend
npm start
```

## Common Issues

### Issue: "relation does not exist" error
**Solution**: The schema wasn't run. Go back to SQL Editor and run `database/schema.sql`

### Issue: "permission denied" error
**Solution**: RLS policies weren't created. Re-run the entire `database/schema.sql` file

### Issue: Can't upload images
**Solution**: Storage bucket or policies missing. Re-run the storage section of `database/schema.sql`

## Testing After Setup

1. Go to http://localhost:5173
2. Click "Register"
3. Create a new account with:
   - Email: test@example.com
   - Password: password123
4. You should be redirected to the dashboard
5. Try creating a session and uploading an image

If registration works, your database is set up correctly! 🎉
