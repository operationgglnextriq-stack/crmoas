-- Voeg recurring_maand_bedrag kolom toe aan deals tabel
-- Dit is het maandelijkse bedrag voor recurring deals.
-- Als null, wordt deal_waarde / 12 gebruikt als schatting.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS recurring_maand_bedrag numeric DEFAULT NULL;
