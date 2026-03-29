-- Voeg 'benaderd' toe als kwalificatiestatus en zet het als nieuwe default
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_kwalificatiestatus_check;
ALTER TABLE leads ADD CONSTRAINT leads_kwalificatiestatus_check 
  CHECK (kwalificatiestatus IN ('benaderd','warm','followup_1','followup_2','followup_3','geboekt','niet','afwijzing'));
ALTER TABLE leads ALTER COLUMN kwalificatiestatus SET DEFAULT 'benaderd';
