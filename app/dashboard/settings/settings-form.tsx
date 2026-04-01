'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, Shield, User } from '@hugeicons/core-free-icons'
import { updateProfile } from './actions'
import { AppIcon } from '@/lib/icons'

export function SettingsForm({
  userEmail,
  fullName,
  role,
}: {
  userEmail: string
  fullName: string
  role: string
}) {
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState(role === 'admin' ? 'admin' : 'sales')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const formData = new FormData(e.currentTarget)
    formData.set('role', currentRole)
    try {
      const result = await updateProfile(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Einstellungen gespeichert')
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="contents">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AppIcon icon={User} size={20} className="text-primary" />
            <CardTitle>Profilinformationen</CardTitle>
          </div>
          <CardDescription>
            Wie Ihr Name in der Anwendung angezeigt wird.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail Adresse</Label>
            <Input
              id="email"
              value={userEmail}
              disabled
              className="bg-muted"
            />
            <p className="text-muted-foreground text-[0.8rem]">
              Ihre E-Mail wird über den Auth-Provider verwaltet.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Vollständiger Name</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={fullName}
              placeholder="Max Mustermann"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-6 py-4">
          <Button type="submit" size="sm" disabled={pending}>
            <AppIcon icon={Save} size={16} className="mr-2" /> Speichern
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2 text-foreground">
            <AppIcon icon={Shield} size={20} />
            <CardTitle>Rolle & Berechtigungen</CardTitle>
          </div>
          <CardDescription>
            Ändern Sie Ihre Rolle zu Testzwecken (nur in dieser Demo möglich).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Aktuelle Rolle</Label>
            <Select
              value={currentRole}
              onValueChange={(v) => setCurrentRole(v as 'admin' | 'sales')}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-6 py-4">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="hover:bg-accent"
            disabled={pending}
          >
            Rolle aktualisieren
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
