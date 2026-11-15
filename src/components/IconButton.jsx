import Tooltip from './Tooltip'
import { ICON } from '../lib/ui'

const tones = {
  default: 'text-muted hover:bg-primary-soft hover:text-primary',
  danger: 'text-muted hover:bg-danger-soft hover:text-danger',
}

// `label` is required: it is the tooltip and the screen-reader name.
export default function IconButton({
  icon: Icon,
  label,
  tone = 'default',
  placement,
  type = 'button',
  className = '',
  ...rest
}) {
  return (
    <Tooltip text={label} placement={placement}>
      <button
        type={type}
        aria-label={label}
        className={`inline-flex size-10 items-center justify-center rounded-base outline-offset-2 transition focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
        {...rest}
      >
        <Icon className={ICON} />
      </button>
    </Tooltip>
  )
}
