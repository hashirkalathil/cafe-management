import { Loader2 } from 'lucide-react'
import { ICON } from '../lib/ui'

const variants = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'bg-primary-soft text-primary hover:opacity-80',
  danger: 'bg-danger text-on-primary hover:opacity-90',
  ghost: 'text-ink hover:bg-primary-soft',
  ghostDanger: 'text-danger hover:bg-danger-soft',
}

export default function Button({
  variant = 'primary',
  icon: Icon,
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-base px-4 text-body font-medium outline-offset-2 transition focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className={`${ICON} animate-spin`} /> : Icon && <Icon className={ICON} />}
      {children}
    </button>
  )
}
