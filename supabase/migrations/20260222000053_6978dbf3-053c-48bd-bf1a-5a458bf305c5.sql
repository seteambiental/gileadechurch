-- Add parent_request_id to link dependent requests to the parent request
ALTER TABLE public.member_requests 
ADD COLUMN parent_request_id UUID REFERENCES public.member_requests(id) ON DELETE SET NULL;

-- Add tipo_dependente to identify if request is for a child, spouse, or main person
ALTER TABLE public.member_requests 
ADD COLUMN tipo_dependente TEXT DEFAULT NULL;

-- Index for faster lookups
CREATE INDEX idx_member_requests_parent_id ON public.member_requests(parent_request_id) WHERE parent_request_id IS NOT NULL;