-- Add attachments column to messages table
-- Run this in Supabase SQL Editor

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Create the attachments storage bucket (if not already created via dashboard)
-- Note: Run this only if you haven't created the bucket via the Supabase dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- Storage policy: allow public read
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'attachments');

-- Storage policy: allow owners to delete
CREATE POLICY "Allow owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
