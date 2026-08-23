export type ManageCompany = {
  id: string
  name: string
  logoUrl: string | null
  isFollowing: boolean
  accountStatus: string | null
}

export type WatchedStakeholder = {
  key: string
  personName: string
  companyName: string | null
  personTitle: string | null
  createdAt: string
  isFollowing: boolean
}

export type ManageWatchlistTab = 'companies' | 'executives'
