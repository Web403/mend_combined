/**
 * Click-outside backdrop shared by Modal/Drawer. Focus-trap behavior lives in
 * hooks/useOverlayFocus.js.
 */
export default function OverlayBackdrop({ onClose, className = "bg-slate-900/45" }) {
  return <div className={`absolute inset-0 ${className}`} onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }} aria-hidden="true" />
}
