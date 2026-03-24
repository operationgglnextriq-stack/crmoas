-- ============================================================
-- NEXTRIQ CRM — Supabase Database Schema
-- Run this in de Supabase SQL Editor
-- ============================================================

-- Teamleden
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  naam TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('founder','sales_manager','setter','outreacher','closer','creator','ambassadeur')),
  afdeling TEXT CHECK (afdeling IN ('sales','outreach','content','management','tech')),
  commissie_pct NUMERIC DEFAULT 0,
  discord_naam TEXT,
  actief BOOLEAN DEFAULT TRUE,
  totale_omzet NUMERIC DEFAULT 0,
  totale_commissie NUMERIC DEFAULT 0
);

-- Leads (van setters via social media)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  bedrijfsnaam TEXT NOT NULL,
  website TEXT,
  contactpersoon TEXT,
  telefoonnummer TEXT,
  emailadres TEXT,
  sector TEXT CHECK (sector IN ('ecommerce','horeca','zakelijk','zorg','bouw','retail','tech','schoonmaak','finance','overig')),
  kanaal TEXT CHECK (kanaal IN ('instagram_dm','tiktok','linkedin','biolink','outbound','referral','checkout','whatsapp','web_form')),
  setter_naam TEXT NOT NULL,
  ambassadeur TEXT,
  creator TEXT,
  bant_budget TEXT CHECK (bant_budget IN ('ja','onduidelijk','nee')),
  bant_autoriteit TEXT CHECK (bant_autoriteit IN ('beslisser','indirect','geen')),
  bant_need TEXT,
  bant_timing TEXT CHECK (bant_timing IN ('1maand','3maanden','6maanden','geen')),
  pijnpunt TEXT,
  kwalificatiestatus TEXT DEFAULT 'followup_1' CHECK (kwalificatiestatus IN ('warm','followup_1','followup_2','followup_3','geboekt','niet','afwijzing')),
  product_interesse TEXT CHECK (product_interesse IN ('website','ai_scan','ai_agency','ink','community','onbekend')),
  closer_naam TEXT,
  datum_call TIMESTAMP,
  is_duplicaat BOOLEAN DEFAULT FALSE,
  duplicaat_van TEXT,
  notities TEXT,
  afdeling TEXT DEFAULT 'sales'
);

-- Outreach leads (van cold outreachers)
CREATE TABLE IF NOT EXISTS outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  bedrijfsnaam TEXT NOT NULL,
  website TEXT,
  contactpersoon TEXT,
  telefoonnummer TEXT,
  emailadres TEXT,
  sector TEXT,
  outreacher_naam TEXT NOT NULL,
  methode TEXT CHECK (methode IN ('cold_call','cold_email','linkedin_outreach','whatsapp','direct_visit')),
  status TEXT DEFAULT 'benaderd' CHECK (status IN ('benaderd','geen_reactie','interesse','afspraak_gemaakt','niet_geinteresseerd','callback')),
  pogingen INTEGER DEFAULT 1,
  laatste_contact TIMESTAMP,
  volgende_actie TIMESTAMP,
  pijnpunt TEXT,
  notities TEXT,
  omgezet_naar_lead BOOLEAN DEFAULT FALSE,
  lead_id UUID REFERENCES leads(id)
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  lead_id UUID REFERENCES leads(id),
  bedrijfsnaam TEXT NOT NULL,
  product TEXT CHECK (product IN ('website_std','website_maat','hosting','ai_scan_pro','ai_scan_dig','ai_agency','ink','comm_klant','comm_extern')),
  deal_status TEXT DEFAULT 'call' CHECK (deal_status IN ('call','offerte','onderhand','gesloten','betaald','levering','opgeleverd','verloren')),
  deal_waarde NUMERIC,
  closer_naam TEXT,
  setter_naam TEXT,
  creator_naam TEXT,
  ambassadeur_naam TEXT,
  outreacher_naam TEXT,
  kanaal TEXT,
  betaling_ontvangen BOOLEAN DEFAULT FALSE,
  betaaldatum DATE,
  commissie_setter NUMERIC,
  commissie_closer NUMERIC,
  commissie_creator NUMERIC,
  commissie_ambassadeur NUMERIC DEFAULT 0,
  commissie_manager NUMERIC,
  commissie_web_developer NUMERIC DEFAULT 0,
  commissie_betaald BOOLEAN DEFAULT FALSE,
  upsell_hosting BOOLEAN DEFAULT FALSE,
  scan_check BOOLEAN DEFAULT FALSE,
  recurring BOOLEAN DEFAULT FALSE,
  notities TEXT
);

-- Marktdata
CREATE TABLE IF NOT EXISTS marktdata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  ingediend_door TEXT NOT NULL,
  afdeling TEXT,
  bedrijf TEXT,
  sector TEXT,
  pijnpunt TEXT NOT NULL,
  software_probleem TEXT,
  categorie TEXT,
  frequentie INTEGER DEFAULT 1,
  product_kans BOOLEAN DEFAULT FALSE,
  doorgegeven BOOLEAN DEFAULT FALSE
);

-- Dagrapporten
CREATE TABLE IF NOT EXISTS dagrapporten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  naam TEXT NOT NULL,
  afdeling TEXT,
  rapport_datum DATE NOT NULL,
  leads_benaderd INTEGER DEFAULT 0,
  cold_calls INTEGER DEFAULT 0,
  calls_geboekt INTEGER DEFAULT 0,
  deals_bijgedragen INTEGER DEFAULT 0,
  pijnpunten TEXT,
  blokkades TEXT,
  op_tijd BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE marktdata ENABLE ROW LEVEL SECURITY;
ALTER TABLE dagrapporten ENABLE ROW LEVEL SECURITY;

-- Helper functie: huidige gebruiker rol ophalen
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS TEXT AS $$
  SELECT rol FROM team_members WHERE email = auth.email()
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_naam()
RETURNS TEXT AS $$
  SELECT naam FROM team_members WHERE email = auth.email()
$$ LANGUAGE SQL SECURITY DEFINER;

-- TEAM MEMBERS policies
CREATE POLICY "Iedereen kan team_members lezen" ON team_members
  FOR SELECT USING (true);

CREATE POLICY "Alleen managers mogen team_members aanmaken" ON team_members
  FOR INSERT WITH CHECK (get_user_rol() IN ('founder','sales_manager'));

CREATE POLICY "Alleen managers mogen team_members aanpassen" ON team_members
  FOR UPDATE USING (get_user_rol() IN ('founder','sales_manager'));

-- LEADS policies
CREATE POLICY "Managers zien alle leads" ON leads
  FOR SELECT USING (get_user_rol() IN ('founder','sales_manager'));

CREATE POLICY "Setter ziet eigen leads" ON leads
  FOR SELECT USING (
    get_user_rol() NOT IN ('founder','sales_manager') AND
    setter_naam = get_user_naam()
  );

CREATE POLICY "Closer ziet leads waar hij closer is" ON leads
  FOR SELECT USING (
    get_user_rol() = 'closer' AND closer_naam = get_user_naam()
  );

CREATE POLICY "Iedereen kan leads aanmaken" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Iedereen kan eigen leads aanpassen" ON leads
  FOR UPDATE USING (
    setter_naam = get_user_naam() OR
    get_user_rol() IN ('founder','sales_manager')
  );

CREATE POLICY "Alleen managers mogen leads verwijderen" ON leads
  FOR DELETE USING (get_user_rol() IN ('founder','sales_manager'));

-- OUTREACH LEADS policies
CREATE POLICY "Managers zien alle outreach" ON outreach_leads
  FOR SELECT USING (get_user_rol() IN ('founder','sales_manager'));

CREATE POLICY "Outreacher ziet eigen outreach" ON outreach_leads
  FOR SELECT USING (
    get_user_rol() = 'outreacher' AND
    outreacher_naam = get_user_naam()
  );

CREATE POLICY "Iedereen kan outreach aanmaken" ON outreach_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Outreacher kan eigen outreach aanpassen" ON outreach_leads
  FOR UPDATE USING (
    outreacher_naam = get_user_naam() OR
    get_user_rol() IN ('founder','sales_manager')
  );

CREATE POLICY "Alleen managers mogen outreach verwijderen" ON outreach_leads
  FOR DELETE USING (get_user_rol() IN ('founder','sales_manager'));

-- DEALS policies
CREATE POLICY "Managers zien alle deals" ON deals
  FOR SELECT USING (get_user_rol() IN ('founder','sales_manager'));

CREATE POLICY "Closer ziet eigen deals" ON deals
  FOR SELECT USING (
    get_user_rol() = 'closer' AND closer_naam = get_user_naam()
  );

CREATE POLICY "Setter ziet deals van eigen leads" ON deals
  FOR SELECT USING (
    get_user_rol() = 'setter' AND setter_naam = get_user_naam()
  );

CREATE POLICY "Iedereen kan deals aanmaken" ON deals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Managers kunnen deals aanpassen" ON deals
  FOR UPDATE USING (get_user_rol() IN ('founder','sales_manager'));

-- MARKTDATA policies
CREATE POLICY "Iedereen kan marktdata lezen" ON marktdata
  FOR SELECT USING (true);

CREATE POLICY "Iedereen kan marktdata toevoegen" ON marktdata
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Managers kunnen marktdata aanpassen" ON marktdata
  FOR UPDATE USING (get_user_rol() IN ('founder','sales_manager'));

-- DAGRAPPORTEN policies
CREATE POLICY "Managers zien alle dagrapporten" ON dagrapporten
  FOR SELECT USING (get_user_rol() IN ('founder','sales_manager'));

CREATE POLICY "Medewerker ziet eigen dagrapporten" ON dagrapporten
  FOR SELECT USING (naam = get_user_naam());

CREATE POLICY "Iedereen kan dagrapport indienen" ON dagrapporten
  FOR INSERT WITH CHECK (naam = get_user_naam() OR get_user_rol() IN ('founder','sales_manager'));

-- ============================================================
-- DEMO DATA (optioneel — verwijder als je live gaat)
-- ============================================================

-- Voeg eerst een founder toe via Supabase Auth, dan:
-- INSERT INTO team_members (naam, email, rol, afdeling, commissie_pct) VALUES
--   ('Saif', 'saif@nextriq.nl', 'founder', 'management', 0),
--   ('Kim', 'kim@nextriq.nl', 'sales_manager', 'management', 5);

-- Todo List module
CREATE TABLE IF NOT EXISTS todos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  titel text NOT NULL,
  omschrijving text,
  prioriteit text DEFAULT 'normaal' CHECK (prioriteit IN ('laag', 'normaal', 'hoog', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'bezig', 'gedaan')),
  toegewezen_aan text,
  aangemaakt_door text NOT NULL,
  deadline date,
  afdeling text
);
