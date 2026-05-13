'use client'
import { createContext, useContext, ReactNode } from 'react'

interface Ctx {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
}

const MobileMenuContext = createContext<Ctx | null>(null)

export function MobileMenuProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  return <MobileMenuContext.Provider value={value}>{children}</MobileMenuContext.Provider>
}

export function useMobileMenu() {
  return useContext(MobileMenuContext)
}
