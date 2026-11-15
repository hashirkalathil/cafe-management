export default function Tooltip({ text, placement = 'bottom', children }) {
  const position = placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-base bg-ink px-2 py-1 text-small text-on-primary hidden shadow-pop group-focus-within:block group-hover:block ${position}`}
      >
        {text}
      </span>
    </span>
  )
}
