import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useInvitations } from './invitations-provider'
export function InvitationsPrimaryButtons() { const { t } = useTranslation(); const { setOpen } = useInvitations(); return <Button size='sm' onClick={() => setOpen('create')}><Plus className='h-4 w-4' />{t('Create Invitation Codes')}</Button> }
