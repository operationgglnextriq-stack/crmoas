ALTER TABLE outreach_leads
  ADD COLUMN IF NOT EXISTS product_interesse TEXT
  CHECK (product_interesse IN ('website','ai_scan','ai_agency','ink','community','onbekend'));

CREATE OR REPLACE FUNCTION auto_convert_outreach_lead()
RETURNS TRIGGER AS $$
DECLARE
  new_lead_id UUID;
BEGIN
  IF NEW.status IN ('interesse', 'afspraak_gemaakt')
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.status NOT IN ('interesse', 'afspraak_gemaakt'))
     AND NEW.omgezet_naar_lead = FALSE
  THEN
    INSERT INTO leads (
      bedrijfsnaam, website, contactpersoon, telefoonnummer,
      emailadres, sector, pijnpunt, notities, setter_naam,
      kanaal, kwalificatiestatus, afdeling, product_interesse
    ) VALUES (
      NEW.bedrijfsnaam, NEW.website, NEW.contactpersoon, NEW.telefoonnummer,
      NEW.emailadres, NEW.sector, NEW.pijnpunt, NEW.notities, NEW.outreacher_naam,
      'outbound', 'followup_1', 'sales', NEW.product_interesse
    )
    RETURNING id INTO new_lead_id;

    NEW.omgezet_naar_lead := TRUE;
    NEW.lead_id := new_lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_convert_outreach_lead ON outreach_leads;

CREATE TRIGGER trigger_auto_convert_outreach_lead
  BEFORE UPDATE ON outreach_leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_convert_outreach_lead();
