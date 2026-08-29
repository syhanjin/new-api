import { InvitationsDeleteDialog } from './invitations-delete-dialog'
import { InvitationsMutateDrawer } from './invitations-mutate-drawer'
import { useInvitations } from './invitations-provider'
export function InvitationsDialogs() {
  const { open, setOpen, currentRow } = useInvitations(); const update = open === 'update'
  return <><InvitationsMutateDrawer open={open === 'create' || update} onOpenChange={(value) => !value && setOpen(null)} currentRow={update ? currentRow || undefined : undefined} /><InvitationsDeleteDialog /></>
}
