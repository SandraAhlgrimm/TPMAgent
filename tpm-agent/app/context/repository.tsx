'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  updated_at: string
  language: string | null
  stargazers_count: number
  forks_count: number
}

interface RepositoryContextType {
  selectedRepository: Repository | null
  setSelectedRepository: (repo: Repository | null) => void
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined)

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null)

  return (
    <RepositoryContext.Provider value={{ selectedRepository, setSelectedRepository }}>
      {children}
    </RepositoryContext.Provider>
  )
}

export function useRepository() {
  const context = useContext(RepositoryContext)
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider')
  }
  return context
}
