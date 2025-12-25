-- Adicionar novos roles ao enum (primeira migração)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ministerial';