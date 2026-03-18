
-- Add student-specific fields so teologia_alunos can exist independently of members
ALTER TABLE public.teologia_alunos ADD COLUMN IF NOT EXISTS nome_aluno text;
ALTER TABLE public.teologia_alunos ADD COLUMN IF NOT EXISTS email_aluno text;
ALTER TABLE public.teologia_alunos ADD COLUMN IF NOT EXISTS cpf_aluno text;
ALTER TABLE public.teologia_alunos ADD COLUMN IF NOT EXISTS whatsapp_aluno text;

-- Make member_id nullable so students without member records can exist
ALTER TABLE public.teologia_alunos ALTER COLUMN member_id DROP NOT NULL;

-- Drop the unique constraint on member_id and recreate it to allow nulls properly
-- Also add a unique constraint on nome_aluno+turma for upsert of unlinked students
DO $$ BEGIN
  -- Try to create a unique index for unlinked students (by normalized name + turma)
  CREATE UNIQUE INDEX IF NOT EXISTS teologia_alunos_nome_turma_idx 
    ON public.teologia_alunos (lower(trim(nome_aluno)), turma) 
    WHERE member_id IS NULL AND nome_aluno IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill nome_aluno from members for existing records
UPDATE public.teologia_alunos ta
SET nome_aluno = m.full_name,
    email_aluno = m.email,
    cpf_aluno = m.cpf,
    whatsapp_aluno = m.whatsapp
FROM public.members m
WHERE ta.member_id = m.id AND ta.nome_aluno IS NULL;
