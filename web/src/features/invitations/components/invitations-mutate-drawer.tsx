import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'
import { DateTimePicker } from '@/components/datetime-picker'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { createInvitations, updateInvitation } from '../api'
import { INVITATION_MESSAGES } from '../constants'
import type { InvitationCode } from '../types'
import { invitationFormSchema } from '../lib/validation'
import { useInvitations } from './invitations-provider'

type Values = z.infer<typeof invitationFormSchema>

export function InvitationsMutateDrawer({ open, onOpenChange, currentRow }: { open: boolean; onOpenChange: (open: boolean) => void; currentRow?: InvitationCode }) {
  const { t } = useTranslation()
  const { triggerRefresh, setResult, setOpen } = useInvitations()
  const [loading, setLoading] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(invitationFormSchema), defaultValues: { mode: 'generate', count: 1, max_uses: 1, codes: '' } })
  const mode = form.watch('mode')
  useEffect(() => { form.reset(currentRow ? { code: currentRow.code, mode: 'generate', count: 1, max_uses: currentRow.max_uses, status: currentRow.status, expired_time: currentRow.expired_time ? new Date(currentRow.expired_time * 1000) : undefined } : { mode: 'generate', count: 1, max_uses: 1, codes: '' }) }, [currentRow, form])
  async function submit(values: Values) {
    setLoading(true)
    try {
      const payload = { code: values.code?.trim(), count: values.mode === 'generate' ? values.count : undefined, max_uses: values.max_uses, status: values.status, codes: values.mode === 'import' ? (values.codes || '').split(/\r?\n/).map((code) => code.trim()) : undefined, expired_time: values.expired_time ? Math.floor(values.expired_time.getTime() / 1000) : 0 }
      if (currentRow) {
        const result = await updateInvitation({ ...payload, id: currentRow.id })
        if (!result.success) { toast.error(result.message || t(INVITATION_MESSAGES.UPDATE_FAILED)); return }
        toast.success(t(INVITATION_MESSAGES.UPDATED))
      } else {
        const result = await createInvitations(payload)
        if (!result.success) { toast.error(result.message || t(INVITATION_MESSAGES.CREATE_FAILED)); return }
        toast.success(t(INVITATION_MESSAGES.CREATED)); onOpenChange(false); triggerRefresh()
        if (result.data) { setResult({ codes: result.data.codes, importedCount: result.data.imported_count, deduplicatedCount: result.data.deduplicated_count, skippedCount: result.data.skipped_count, skipped: result.data.skipped }); setOpen('create-result') }
        return
      }
      onOpenChange(false); triggerRefresh()
    } finally { setLoading(false) }
  }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className='sm:max-w-lg'><SheetHeader><SheetTitle>{t(currentRow ? 'Edit Invitation Code' : 'Create Invitation Codes')}</SheetTitle></SheetHeader><Form {...form}><form onSubmit={form.handleSubmit(submit)} className='space-y-5 p-4'>{currentRow && <FormField control={form.control} name='code' render={({ field }) => <FormItem><FormLabel>{t('Invitation Code')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />}{!currentRow && <FormField control={form.control} name='mode' render={({ field }) => <FormItem><FormLabel>{t('Creation mode')}</FormLabel><FormControl><select className='h-9 w-full rounded-md border bg-background px-3 text-sm' {...field}><option value='generate'>{t('Generate randomly')}</option><option value='import'>{t('Import custom codes')}</option></select></FormControl><FormMessage /></FormItem>} />}{mode === 'generate' || currentRow ? !currentRow && <FormField control={form.control} name='count' render={({ field }) => <FormItem><FormLabel>{t('Count')}</FormLabel><FormControl><Input type='number' {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} /> : <FormField control={form.control} name='codes' render={({ field }) => <FormItem><FormLabel>{t('Custom invitation codes')}</FormLabel><FormControl><Textarea {...field} rows={8} placeholder={t('One invitation code per line')} /></FormControl><FormMessage /></FormItem>} />}{currentRow && <FormField control={form.control} name='status' render={({ field }) => <FormItem><FormLabel>{t('Status')}</FormLabel><FormControl><select className='h-9 w-full rounded-md border bg-background px-3 text-sm' value={field.value ?? 1} onChange={(e) => field.onChange(Number(e.target.value))}><option value='1'>{t('Enabled')}</option><option value='2'>{t('Disabled')}</option></select></FormControl><FormMessage /></FormItem>} />}<FormField control={form.control} name='max_uses' render={({ field }) => <FormItem><FormLabel>{t('Max Uses')}</FormLabel><FormControl><Input type='number' {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name='expired_time' render={({ field }) => <FormItem><FormLabel>{t('Expiration Time')}</FormLabel><FormControl><DateTimePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} /><SheetFooter><Button type='submit' disabled={loading}>{t('Save')}</Button></SheetFooter></form></Form></SheetContent></Sheet>
}
