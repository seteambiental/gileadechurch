# Architecture rules
- Use ManualDateInput for event registration date fields; it keeps typed drafts separate from ISO values and validates dates without a calendar.
- Internal data access rules use public.is_church_user() (account with a role or linked to an active member), never just "signed in"; signup is open, so any account could otherwise read everything.
- Keep event participant phone corrections in inscricao-telefone and update both Impacto and Agenda contact fields; message sending must use the corrected number without changing event or payment state.
