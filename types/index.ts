export type Rol = 'founder' | 'sales_manager' | 'setter' | 'outreacher' | 'closer' | 'creator' | 'ambassadeur' | 'web_developer' | 'head_of_tech' | 'ai_engineer'
export type Afdeling = 'sales' | 'outreach' | 'content' | 'management' | 'tech'

export interface TeamMember {
  id: string
  created_at: string
  naam: string
  email: string
  rol: Rol
  afdeling: Afdeling | null
  commissie_pct: number
  discord_naam: string | null
  actief: boolean
  totale_omzet: number
  totale_commissie: number
}

export type Sector = 'ecommerce' | 'horeca' | 'zakelijk' | 'zorg' | 'bouw' | 'retail' | 'tech' | 'schoonmaak' | 'finance' | 'overig'
export type Kanaal = 'instagram_dm' | 'tiktok' | 'linkedin' | 'biolink' | 'outbound' | 'referral' | 'checkout' | 'whatsapp' | 'web_form'
export type KwalificatieStatus = 'warm' | 'followup_1' | 'followup_2' | 'followup_3' | 'geboekt' | 'niet' | 'afwijzing'
export type ProductInteresse = 'website' | 'ai_scan' | 'ai_agency' | 'ink' | 'community' | 'onbekend'
export type BantBudget = 'ja' | 'onduidelijk' | 'nee'
export type BantAutoriteit = 'beslisser' | 'indirect' | 'geen'
export type BantTiming = '1maand' | '3maanden' | '6maanden' | 'geen'

export interface Lead {
  id: string
  created_at: string
  bedrijfsnaam: string
  website: string | null
  contactpersoon: string | null
  telefoonnummer: string | null
  emailadres: string | null
  sector: Sector | null
  kanaal: Kanaal | null
  setter_naam: string
  ambassadeur: string | null
  creator: string | null
  bant_budget: BantBudget | null
  bant_autoriteit: BantAutoriteit | null
  bant_need: string | null
  bant_timing: BantTiming | null
  pijnpunt: string | null
  kwalificatiestatus: KwalificatieStatus
  product_interesse: ProductInteresse | null
  closer_naam: string | null
  datum_call: string | null
  is_duplicaat: boolean
  duplicaat_van: string | null
  notities: string | null
  afdeling: string
}

export type OutreachMethode = 'cold_call' | 'cold_email' | 'linkedin_outreach' | 'whatsapp' | 'direct_visit'
export type OutreachStatus = 'benaderd' | 'geen_reactie' | 'interesse' | 'afspraak_gemaakt' | 'niet_geinteresseerd' | 'callback'

export interface OutreachLead {
  id: string
  created_at: string
  bedrijfsnaam: string
  website: string | null
  contactpersoon: string | null
  telefoonnummer: string | null
  emailadres: string | null
  sector: string | null
  outreacher_naam: string
  methode: OutreachMethode | null
  status: OutreachStatus
  pogingen: number
  laatste_contact: string | null
  volgende_actie: string | null
  pijnpunt: string | null
  notities: string | null
  omgezet_naar_lead: boolean
  lead_id: string | null
  product_interesse?: ProductInteresse | null
}

export type Product = 'website_std' | 'website_maat' | 'hosting' | 'ai_scan_pro' | 'ai_scan_dig' | 'ai_agency' | 'ink' | 'comm_klant' | 'comm_extern'
export type DealStatus = 'call' | 'offerte' | 'onderhand' | 'gesloten' | 'betaald' | 'levering' | 'opgeleverd' | 'verloren'

export const WEBSITE_PRODUCTEN: Product[] = ['website_std', 'website_maat', 'hosting']

export interface Deal {
  id: string
  created_at: string
  lead_id: string | null
  bedrijfsnaam: string
  product: Product | null
  deal_status: DealStatus
  deal_waarde: number | null
  closer_naam: string | null
  setter_naam: string | null
  creator_naam: string | null
  ambassadeur_naam: string | null
  outreacher_naam: string | null
  kanaal: string | null
  betaling_ontvangen: boolean
  betaaldatum: string | null
  commissie_setter: number | null
  commissie_closer: number | null
  commissie_creator: number | null
  commissie_ambassadeur: number | null
  commissie_manager: number | null
  commissie_web_developer: number | null
  commissie_betaald: boolean
  upsell_hosting: boolean
  scan_check: boolean
  recurring: boolean
  recurring_maand_bedrag: number | null
  recurring_commissie_leden: string[] | null
  notities: string | null
}

export interface Marktdata {
  id: string
  created_at: string
  ingediend_door: string
  afdeling: string | null
  bedrijf: string | null
  sector: string | null
  pijnpunt: string
  software_probleem: string | null
  categorie: string | null
  frequentie: number
  product_kans: boolean
  doorgegeven: boolean
}

export interface Dagrapport {
  id: string
  created_at: string
  naam: string
  afdeling: string | null
  rapport_datum: string
  leads_benaderd: number
  cold_calls: number
  calls_geboekt: number
  deals_bijgedragen: number
  actieve_gesprekken: number
  volle_ups: number
  pijnpunten: string | null
  blokkades: string | null
  op_tijd: boolean
}

export type BANTScore = 'sterk' | 'matig' | 'zwak'

export function calcBANT(lead: Partial<Lead>): BANTScore {
  let score = 0
  if (lead.bant_budget === 'ja') score++
  if (lead.bant_autoriteit === 'beslisser') score++
  if (lead.bant_timing === '1maand' || lead.bant_timing === '3maanden') score++
  if (score >= 3) return 'sterk'
  if (score >= 2) return 'matig'
  return 'zwak'
}

// Bereken web developer commissie (25% van website deals)
export function calcWebDevCommissie(deal_waarde: number | null, product: Product | null): number {
  if (!deal_waarde || !product) return 0
  if (!WEBSITE_PRODUCTEN.includes(product)) return 0
  return Math.round(deal_waarde * 0.25)
}

// Feature 3: Lead Acties
export type ActieType = 'eerste_contact' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'terugbellen' | 'offerte_sturen'
export type ActieStatus = 'open' | 'gedaan'

export interface LeadActie {
  id: string
  created_at: string
  lead_id: string
  toegewezen_aan: string
  type: ActieType
  gepland_op: string
  notitie: string | null
  status: ActieStatus
  afgerond_op: string | null
}
