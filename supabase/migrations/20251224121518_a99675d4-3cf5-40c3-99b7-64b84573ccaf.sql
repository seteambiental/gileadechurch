-- Add photo_url column to encontros_casa_refugio
ALTER TABLE public.encontros_casa_refugio 
ADD COLUMN photo_url TEXT;

-- Create storage bucket for meeting photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('encontros-fotos', 'encontros-fotos', true);

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload encontros photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'encontros-fotos');

-- Create policy to allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view encontros photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'encontros-fotos');

-- Create policy to allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete encontros photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'encontros-fotos');