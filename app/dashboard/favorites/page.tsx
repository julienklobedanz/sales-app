import { redirect } from 'next/navigation'

export default function FavoritesPage() {
  redirect('/dashboard?favoriten=1')
}
