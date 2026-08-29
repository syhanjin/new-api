import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog'
import type { InvitationCode, InvitationsDialogType } from '../types'

type InvitationsContext = { open: InvitationsDialogType | null; setOpen: (value: InvitationsDialogType | null) => void; currentRow: InvitationCode | null; setCurrentRow: React.Dispatch<React.SetStateAction<InvitationCode | null>>; refreshTrigger: number; triggerRefresh: () => void }
const Context = React.createContext<InvitationsContext | null>(null)
export function InvitationsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<InvitationsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<InvitationCode | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  return <Context value={{ open, setOpen, currentRow, setCurrentRow, refreshTrigger, triggerRefresh: () => setRefreshTrigger((v) => v + 1) }}>{children}</Context>
}
export function useInvitations() {
  const context = React.useContext(Context)
  if (!context) throw new Error('useInvitations has to be used within <InvitationsProvider>')
  return context
}
