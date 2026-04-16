'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

function parseDataUrlImage(dataUrl: string): { bytes: Uint8Array; contentType: string; ext: string } | null {
  const trimmed = dataUrl.trim()
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const contentType = match[1]
  const b64 = match[2]
  const buf = Buffer.from(b64, 'base64')
  if (!buf.length) return null
  const ext =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/jpeg'
        ? 'jpg'
        : contentType === 'image/webp'
          ? 'webp'
          : 'png'
  return { bytes: new Uint8Array(buf), contentType, ext }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const role = formData.get('role')?.toString() as 'admin' | 'sales' | undefined
  const avatarDataUrlRaw = formData.get('avatarDataUrl')?.toString() ?? undefined
  const avatarDataUrl =
    avatarDataUrlRaw !== undefined ? avatarDataUrlRaw.trim() || null : undefined

  const updates: Record<string, unknown> = {}

  if (fullName !== undefined && fullName !== '') updates.full_name = fullName
  if (role && (role === 'admin' || role === 'sales')) updates.role = role
  if (avatarDataUrl !== undefined) {
    if (!avatarDataUrl) {
      updates.avatar_url = null
    } else {
      const parsed = parseDataUrlImage(avatarDataUrl)
      if (!parsed) {
        return { error: 'Ungültiges Avatar-Format.' }
      }
      const path = `${user.id}/avatar.${parsed.ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, parsed.bytes, {
          upsert: true,
          contentType: parsed.contentType,
          cacheControl: '3600',
        })
      if (uploadErr) {
        return { error: uploadErr.message }
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      updates.avatar_url = data.publicUrl
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.settings)
  return { success: true }
}
