-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pcmetylyouuxgsawdcnn/sql

ALTER TABLE deals ADD COLUMN IF NOT EXISTS commissie_ambassadeur numeric DEFAULT 0;
