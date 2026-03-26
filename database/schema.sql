-- Fish Disease Detection Application - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('fish_detection', 'disease_detection')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detections table
CREATE TABLE IF NOT EXISTS detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    detection_type TEXT NOT NULL CHECK (detection_type IN ('fish_detection', 'disease_detection')),
    image_url TEXT,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detections_session_id ON detections(session_id);
CREATE INDEX IF NOT EXISTS idx_detections_user_id ON detections(user_id);
CREATE INDEX IF NOT EXISTS idx_detections_created_at ON detections(created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can view their own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Detections policies
CREATE POLICY "Users can view their own detections"
    ON detections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own detections"
    ON detections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own detections"
    ON detections FOR DELETE
    USING (auth.uid() = user_id);

-- Storage bucket for fish images
-- Run this separately in Supabase Storage section or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('fish-images', 'fish-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for fish-images bucket
CREATE POLICY "Users can upload their own images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'fish-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'fish-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'fish-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Public access to images (since we're using public URLs)
CREATE POLICY "Public can view images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'fish-images');
