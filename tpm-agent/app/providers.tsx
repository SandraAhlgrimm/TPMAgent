'use client'

import { SessionProvider } from "next-auth/react"
import { RepositoryProvider } from "./context/repository"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RepositoryProvider>
        {children}
      </RepositoryProvider>
    </SessionProvider>
  )
}
