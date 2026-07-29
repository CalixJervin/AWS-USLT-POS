-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up access policies for the bucket
-- Allow public access to read images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- Allow anyone to upload images for now (in a real app, you'd restrict this to authenticated users)
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- Allow anyone to update/delete their own uploads (or all for now)
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
