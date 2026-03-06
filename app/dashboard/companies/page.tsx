import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Building2Icon, MapPinIcon } from 'lucide-react'

export default async function CompaniesPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, logo_url, website_url, headquarters, industry')
    .order('name')

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Übersicht aller Firmen – Absprungpunkt für Executive Profiling, News & Stakeholder-Mapping (in Vorbereitung).
        </p>
      </div>

      {!companies?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2Icon className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Noch keine Firmen angelegt.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Firmen werden beim Anlegen von Referenzen automatisch erfasst.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {company.logo_url ? (
                    <div className="relative size-12 shrink-0 rounded-md border bg-muted overflow-hidden">
                      <Image
                        src={company.logo_url}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                      <Building2Icon className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{company.name}</CardTitle>
                    {company.industry && (
                      <CardDescription className="text-xs mt-0.5 truncate">
                        {company.industry}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {company.headquarters && (
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    <span className="truncate">{company.headquarters}</span>
                  </div>
                )}
                {company.website_url && (
                  <a
                    href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate block mt-1"
                  >
                    {company.website_url.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
