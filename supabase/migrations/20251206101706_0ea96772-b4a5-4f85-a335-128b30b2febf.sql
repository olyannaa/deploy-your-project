-- Add 'accountant' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';

-- Add hourly_rate column to profiles for storing чел/день rate
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT NULL;

-- Add contract_rate column for project-specific rates
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_rate numeric DEFAULT NULL;