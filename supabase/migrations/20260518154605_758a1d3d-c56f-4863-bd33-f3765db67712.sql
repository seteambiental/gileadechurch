-- Bucket público para anexos de WhatsApp
insert into storage.buckets (id, name, public)
values ('whatsapp-anexos', 'whatsapp-anexos', true)
on conflict (id) do update set public = true;

-- Leitura pública
create policy "WhatsApp anexos publicos"
on storage.objects for select
using (bucket_id = 'whatsapp-anexos');

-- Upload por usuários autenticados
create policy "WhatsApp anexos upload autenticado"
on storage.objects for insert
to authenticated
with check (bucket_id = 'whatsapp-anexos');

-- Atualização/Exclusão pelo dono
create policy "WhatsApp anexos update proprio"
on storage.objects for update
to authenticated
using (bucket_id = 'whatsapp-anexos' and owner = auth.uid());

create policy "WhatsApp anexos delete proprio"
on storage.objects for delete
to authenticated
using (bucket_id = 'whatsapp-anexos' and owner = auth.uid());