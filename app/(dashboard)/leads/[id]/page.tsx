'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lead } from '@/types'
import { BANTBadge, KwalificatieBadge } from '@/components/ui/Badge'
import { calcBANT } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('leads').select('*').eq('id', params.id).single()
      .then(({ data }) => { setLead(data); setLoading(false) })
  }, [params.id])

  if (loading) return <LoadingSpinner />
  if (!lead) return <div className="card text-center text-gray-400 py-12">Lead niet gevonden</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/leads" className="text-sm text-gray-500 hover:text-[#1B2A4A]">← Terug</Link>
        <h2 className="text-xl font-bold text-[#1B2A4A]">{lead.bedrijfsnaam}</h2>
        <BANTBadge score={calcBANT(lead)} />
        <KwalificatieBadge status={lead.kwalificatiestatus} />
        {lead.is_duplicaat && <span className="badge bg-orange-100 text-orange-800">⚠️ Duplicaat</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Bedrijfsinfo</h3>
          <Row label="Website" value={lead.website} />
          <Row label="Contactpersoon" value={lead.contactpersoon} />
          <Row label="Telefoon" value={lead.telefoonnummer} />
          <Row label="E-mail" value={lead.emailadres} />
          <Row label="Sector" value={lead.sector} />
          <Row label="Kanaal" value={lead.kanaal?.replace(/_/g, ' ')} />
          <Row label="Setter" value={lead.setter_naam} />
          <Row label="Datum" value={format(new Date(lead.created_at), 'd MMMM yyyy', { locale: nl })} />
        </div>
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 border-b pb-2">BANT Kwalificatie</h3>
          <Row label="Budget" value={lead.bant_budget} />
          <Row label="Autoriteit" value={lead.bant_autoriteit} />
          <Row label="Behoefte" value={lead.bant_need} />
          <Row label="Timing" value={lead.bant_timing} />
          <Row label="Pijnpunt" value={lead.pijnpunt} />
        </div>
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Product & Sales</h3>
          <Row label="Product interesse" value={lead.product_interesse?.replace(/_/g, ' ')} />
          <Row label="Closer" value={lead.closer_naam} />
          <Row label="Datum call" value={lead.datum_call ? format(new Date(lead.datum_call), 'd MMM yyyy HH:mm', { locale: nl }) : '-'} />
          <Row label="Ambassadeur" value={lead.ambassadeur} />
          <Row label="Creator" value={lead.creator} />
        </div>
        {lead.notities && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Notities</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.notities}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm gap-3">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value || '-'}</span>
    </div>
  )
}
