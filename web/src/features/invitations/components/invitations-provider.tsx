import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog'
import type { InvitationBatch, InvitationCode, InvitationView, InvitationsDialogType } from '../types'

type InvitationsContext = {
  open: InvitationsDialogType | null
  setOpen: (value: InvitationsDialogType | null) => void
  currentRow: InvitationCode | null
  setCurrentRow: React.Dispatch<React.SetStateAction<InvitationCode | null>>
  currentBatch: InvitationBatch | null
  setCurrentBatch: React.Dispatch<React.SetStateAction<InvitationBatch | null>>
  view: InvitationView
  openBatch: (batch: InvitationBatch) => void
  showBatches: () => void
  result: { batchName: string; codes: string[] } | null
  setResult: React.Dispatch<React.SetStateAction<{ batchName: string; codes: string[] } | null>>
  refreshTrigger: number
  triggerRefresh: () => void
}
const Context = React.createContext<InvitationsContext | null>(null)
export function InvitationsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<InvitationsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<InvitationCode | null>(null)
  const [currentBatch, setCurrentBatch] = useState<InvitationBatch | null>(null)
  const [view, setView] = useState<InvitationView>('batches')
  const [result, setResult] = useState<{ batchName: string; codes: string[] } | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const openBatch = (batch: InvitationBatch) => { setCurrentBatch(batch); setView('codes') }
  const showBatches = () => { setCurrentBatch(null); setView('batches') }
  return <Context value={{ open, setOpen, currentRow, setCurrentRow, currentBatch, setCurrentBatch, view, openBatch, showBatches, result, setResult, refreshTrigger, triggerRefresh: () => setRefreshTrigger((v) => v + 1) }}>{children}</Context>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useInvitations() {
  const context = React.useContext(Context)
  if (!context) throw new Error('useInvitations has to be used within <InvitationsProvider>')
  return context
}
