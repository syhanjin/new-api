import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { InvitationsCreateResultDialog } from '../components/invitations-create-result-dialog'
import { InvitationsProvider, useInvitations } from '../components/invitations-provider'

function ResultHarness() {
  const { setOpen, setResult } = useInvitations()
  return (
    <button type='button'
      onClick={() => {
        setResult({
          codes: ['NEW-CODE'],
          importedCount: 1,
          deduplicatedCount: 2,
          skippedCount: 1,
          skipped: [{ line: 4, code: '', reason: 'Empty code' }],
        })
        setOpen('create-result')
      }}
    >
      show result
    </button>
  )
}

describe('invitation create result', () => {
  test('shows deduplicated count separately from skipped entries', async () => {
    render(
      <InvitationsProvider>
        <ResultHarness />
        <InvitationsCreateResultDialog />
      </InvitationsProvider>
    )

    screen.getByRole('button', { name: 'show result' }).click()

    expect(await screen.findByText('1 imported · 2 deduplicated · 1 skipped')).toBeInTheDocument()
    expect(screen.getByText('NEW-CODE')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent('Line 4: Empty · Empty code')
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument()
  })
})
