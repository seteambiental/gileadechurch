-- Create table for homepage videos
CREATE TABLE public.homepage_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  video_url text NOT NULL,
  thumbnail_url text,
  ordem integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_videos ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view homepage_videos"
ON public.homepage_videos FOR SELECT
USING (true);

-- Authenticated users can manage
CREATE POLICY "Authenticated users can insert homepage_videos"
ON public.homepage_videos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update homepage_videos"
ON public.homepage_videos FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete homepage_videos"
ON public.homepage_videos FOR DELETE
USING (auth.uid() IS NOT NULL);