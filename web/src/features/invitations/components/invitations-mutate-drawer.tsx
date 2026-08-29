import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { DateTimePicker } from '@/components/datetime-picker'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createInvitations, updateInvitation } from '../api'
import { INVITATION_MESSAGES, INVITATION_VALIDATION } from '../constants'
import type { InvitationCode } from '../types'
import { useInvitations } from './invitations-provider'
const schema = z.object({ name: z.string().min(1).max(INVITATION_VALIDATION.NAME_MAX), count: z.number().int().min(1).max(100), max_uses: z.number().int().min(1), expired_time: z.date().optional() })
type Values = z.infer<typeof schema>
export function InvitationsMutateDrawer({ open, onOpenChange, currentRow }: { open: boolean; onOpenChange: (open: boolean) => void; currentRow?: InvitationCode }) {
  const { t } = useTranslation(); const { triggerRefresh } = useInvitations(); const [loading, setLoading] = useState(false); const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', count: 1, max_uses: 1 } })
  useEffect(() => { form.reset(currentRow ? { name: currentRow.name || '', count: 1, max_uses: currentRow.max_uses, expired_time: currentRow.expired_time ? new Date(currentRow.expired_time * 1000) : undefined } : { name: '', count: 1, max_uses: 1 }) }, [currentRow, form])
  async function submit(values: Values) { setLoading(true); try { const payload = { ...values, expired_time: values.expired_time ? Math.floor(values.expired_time.getTime() / 1000) : 0 }; const result = currentRow ? await updateInvitation({ ...payload, id: currentRow.id }) : await createInvitations(payload); if (!result.success) { toast.error(result.message || t(currentRow ? INVITATION_MESSAGES.UPDATE_FAILED : INVITATION_MESSAGES.CREATE_FAILED)); return }; toast.success(t(currentRow ? INVITATION_MESSAGES.UPDATED : INVITATION_MESSAGES.CREATED)); onOpenChange(false); triggerRefresh() } finally { setLoading(false) } }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className='sm:max-w-lg'><SheetHeader><SheetTitle>{t(currentRow ? 'Edit Invitation Code' : 'Create Invitation Codes')}</SheetTitle></SheetHeader><Form {...form}><form onSubmit={form.handleSubmit(submit)} className='space-y-5 p-4'><FormField control={form.control} name='name' render={({ field }) => <FormItem><FormLabel>{t('Batch Name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name='count' render={({ field }) => <FormItem><FormLabel>{t('Count')}</FormLabel><FormControl><Input type='number' disabled={!!currentRow} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name='max_uses' render={({ field }) => <FormItem><FormLabel>{t('Maximum Uses')}</FormLabel><FormControl><Input type='number' {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name='expired_time' render={({ field }) => <FormItem><FormLabel>{t('Expiration')}</FormLabel><FormControl><DateTimePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} /><SheetFooter><Button type='submit' disabled={loading}>{loading ? t('Saving...') : t('Save')}</Button></SheetFooter></form></Form></SheetContent></Sheet>
}
