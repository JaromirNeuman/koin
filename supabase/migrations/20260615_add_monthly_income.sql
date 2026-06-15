-- Adds the optional monthly_income column used by onboarding & settings.
-- Run in the Supabase SQL editor (or via the Supabase CLI) once.

alter table public.users
  add column if not exists monthly_income numeric;
