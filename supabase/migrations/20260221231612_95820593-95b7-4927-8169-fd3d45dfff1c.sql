
-- Add tipo column to distinguish between filho and conjuge
ALTER TABLE public.member_request_filhos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'filho';
