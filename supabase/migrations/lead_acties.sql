CREATE TABLE IF NOT EXISTS lead_acties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  toegewezen_aan TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('eerste_contact', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'terugbellen', 'offerte_sturen')),
  gepland_op TIMESTAMP NOT NULL,
  notitie TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'gedaan')),
  afgerond_op TIMESTAMP
);

ALTER TABLE lead_acties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers zien alle acties" ON lead_acties
  FOR SELECT USING (get_user_rol() IN ('founder', 'sales_manager'));

CREATE POLICY "Medewerker ziet eigen acties" ON lead_acties
  FOR SELECT USING (
    get_user_rol() NOT IN ('founder', 'sales_manager') AND
    toegewezen_aan = get_user_naam()
  );

CREATE POLICY "Iedereen kan acties aanmaken" ON lead_acties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Medewerker kan eigen acties updaten" ON lead_acties
  FOR UPDATE USING (
    toegewezen_aan = get_user_naam() OR
    get_user_rol() IN ('founder', 'sales_manager')
  );

CREATE POLICY "Alleen managers mogen acties verwijderen" ON lead_acties
  FOR DELETE USING (get_user_rol() IN ('founder', 'sales_manager'));
