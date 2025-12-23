-- Add member_since column to track when member joined the church
ALTER TABLE public.members 
ADD COLUMN member_since DATE;