import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import { useToast } from '../components/Toast'
import { ICON } from '../lib/ui'
import { getSettings, saveSettings } from '../services/settings'

export default function Settings() {
  const toast = useToast()
  const [row, setRow] = useState(null)
  const [form, setForm] = useState(null)
  const [failed, setFailed] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getSettings()
      if (!data) throw new Error("Settings are missing. Please run the database setup again.")
      setRow(data)
      setForm({
        restaurantName: data.restaurant_name,
        address: data.address,
        phone: data.phone,
        taxPercent: String(data.tax_percent),
      })
      setFailed(false)
    } catch (err) {
      setFailed(true)
      toast.error(err.message)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
  }

  async function save(e) {
    e.preventDefault()
    if (busy) return
    const tax = Number(form.taxPercent)
    const next = {}
    if (!form.restaurantName.trim()) next.restaurantName = 'Enter a name.'
    if (form.taxPercent.trim() === '' || Number.isNaN(tax) || tax < 0 || tax > 100) {
      next.taxPercent = 'Enter a number from 0 to 100.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await saveSettings(row.id, { ...form, taxPercent: tax })
      toast.success('Saved')
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl p-4 lg:p-8">
      <h1 className="mb-4 text-title font-semibold">Settings</h1>

      {!form && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && !form && <EmptyState title="Couldn't load settings" actionLabel="Try again" onAction={load} />}

      {form && (
        <form onSubmit={save} noValidate className="flex flex-col gap-4 rounded-base bg-surface p-5 shadow-card">
          <Field label="Restaurant name" value={form.restaurantName} onChange={set('restaurantName')} error={errors.restaurantName} />
          <Field label="Address" value={form.address} onChange={set('address')} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} />
          <Field
            label="Tax (%)"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.01"
            value={form.taxPercent}
            onChange={set('taxPercent')}
            error={errors.taxPercent}
          />
          <Button type="submit" icon={Save} loading={busy}>Save</Button>
        </form>
      )}
    </main>
  )
}
