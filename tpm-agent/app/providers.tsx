'use client'

import { SessionProvider } from "next-auth/react"
import { RepositoryProvider } from "./context/repository"
import { ToastProvider } from "./utils/toast"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RepositoryProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </RepositoryProvider>
    </SessionProvider>
  )
}
