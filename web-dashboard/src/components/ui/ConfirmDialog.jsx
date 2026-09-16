import { useState } from "react"
import Modal from "./Modal"
import Button from "./Button"
import { IconAlert, IconInfo } from "./Icons"

/**
 * The single confirmation pattern for the whole console.
 * Destructive flows: clear consequence text + explicit confirm. For the most
 * destructive operations (deleting a tenant / a user account), pass
 * `requireText="<exact name>"` — the confirm button stays disabled until the
 * admin types it.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  danger = false,
  requireText,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState("")
  // Reset the typed confirmation whenever the dialog opens/closes (React's
  // "adjusting state on prop change during render" pattern — no effect churn).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    setTyped("")
  }

  const mismatch = Boolean(requireText) && typed.trim() !== requireText
  const close = () => {
    if (!busy) onCancel?.()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      closeOnBackdrop={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={busy}
            disabled={mismatch}
            onClick={onConfirm}
            data-autofocus={!requireText ? true : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            danger ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"
          }`}
        >
          {danger ? <IconAlert size={15} /> : <IconInfo size={15} />}
        </span>
        <div className="min-w-0 text-[13px] leading-relaxed text-slate-600">
          <p>{description}</p>
          {detail && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">{detail}</p>}
        </div>
      </div>

      {requireText && (
        <div className="mt-4">
          <label htmlFor="confirm-type-name" className="mb-1 block text-xs font-medium text-slate-500">
            Type <span className="font-semibold text-slate-800">{requireText}</span> to confirm
          </label>
          <input
            id="confirm-type-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
          />
        </div>
      )}
    </Modal>
  )
}
