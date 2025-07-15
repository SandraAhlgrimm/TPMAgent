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
  lastUpdatedRepositoryId: number | null
  markRepositoryContextUpdated: (repoId: number | null) => void
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined)

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedRepository')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return null
        }
      }
    }
    return null
  })

  const [lastUpdatedRepositoryId, setLastUpdatedRepositoryId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastUpdatedRepositoryId')
      return saved ? parseInt(saved, 10) : null
    }
    return null
  })

  const handleSetSelectedRepository = (repo: Repository | null) => {
    setSelectedRepository(repo)
    if (typeof window !== 'undefined') {
      if (repo) {
        localStorage.setItem('selectedRepository', JSON.stringify(repo))
        // When a repository is selected, we need to update its context
        // Reset the lastUpdatedRepositoryId so the chat component knows to update
        setLastUpdatedRepositoryId(null)
        localStorage.removeItem('lastUpdatedRepositoryId')
      } else {
        localStorage.removeItem('selectedRepository')
        setLastUpdatedRepositoryId(null)
        localStorage.removeItem('lastUpdatedRepositoryId')
      }
    }
  }

  const markRepositoryContextUpdated = (repoId: number | null) => {
    setLastUpdatedRepositoryId(repoId)
    if (typeof window !== 'undefined') {
      if (repoId !== null) {
        localStorage.setItem('lastUpdatedRepositoryId', repoId.toString())
      } else {
        localStorage.removeItem('lastUpdatedRepositoryId')
      }
    }
  }

  return (
    <RepositoryContext.Provider value={{ 
      selectedRepository, 
      setSelectedRepository: handleSetSelectedRepository,
      lastUpdatedRepositoryId,
      markRepositoryContextUpdated
    }}>
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
