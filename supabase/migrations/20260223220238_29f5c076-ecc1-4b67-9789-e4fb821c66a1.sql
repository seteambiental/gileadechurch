-- Allow users to delete their own solicitações
CREATE POLICY "Users can delete own solicitacoes"
ON public.sistema_solicitacoes
FOR DELETE
USING (auth.uid() = solicitante_id);

-- Allow admins to delete any solicitação
CREATE POLICY "Admins can delete all solicitacoes"
ON public.sistema_solicitacoes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pastor_geral')
  )
);