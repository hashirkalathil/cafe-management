import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'

// onConfirm can be async. The button shows a spinner and ignores extra taps until it finishes.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}
