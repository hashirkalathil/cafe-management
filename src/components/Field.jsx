import { useId } from 'react'

// Label + input (or dropdown when `options` is given) + error text under the box.
export default function Field({ label, error, options, className = '', ...rest }) {
  const id = useId()
  const box = `h-10 w-full rounded-base bg-canvas px-3 text-body outline-offset-0 focus:outline-2 focus:outline-primary ${
    error ? 'outline-2 outline-danger' : ''
  }`
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-small font-medium">
        {label}
      </label>
      {options ? (
        <select id={id} className={box} aria-invalid={Boolean(error)} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} className={box} aria-invalid={Boolean(error)} {...rest} />
      )}
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  )
}
