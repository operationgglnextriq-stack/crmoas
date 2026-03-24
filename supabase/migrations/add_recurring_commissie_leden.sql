ALTER TABLE deals ADD COLUMN IF NOT EXISTS recurring_commissie_leden text[] DEFAULT NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recurring_maand_bedrag numeric DEFAULT NULL;
