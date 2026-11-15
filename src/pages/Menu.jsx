import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Loader2, Pencil, Plus, Power, RotateCcw } from 'lucide-react'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import IconButton from '../components/IconButton'
import Modal from '../components/Modal'
import Switch from '../components/Switch'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { money } from '../lib/format'
import { ICON } from '../lib/ui'
import {
  listMenu, saveCategory, saveItem, setCategoryActive, setItemActive, setItemAvailable,
} from '../services/menu'

const vegOptions = [
  { value: 'veg', label: 'Veg' },
  { value: 'nonveg', label: 'Non-veg' },
]

function GroupForm({ group, nextOrder, onClose, onSaved }) {
  const toast = useToast()
  const [name, setName] = useState(group?.name ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e) {
    e.preventDefault()
    if (busy) return
    if (!name.trim()) return setError('Enter a name.')
    setBusy(true)
    try {
      await saveCategory(group?.id, { name }, nextOrder)
      toast.success('Saved')
      onSaved()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={group ? 'Edit group' : 'Add group'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="group-form" loading={busy}>Save</Button>
        </>
      }
    >
      <form id="group-form" onSubmit={save} noValidate>
        <Field label="Name" value={name} onChange={(e) => { setName(e.target.value); setError('') }} error={error} autoFocus />
      </form>
    </Modal>
  )
}

function ItemForm({ item, groups, defaultGroup, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: item?.name ?? '',
    categoryId: item?.category_id ?? defaultGroup ?? groups[0]?.id ?? '',
    price: item ? String(item.price) : '',
    veg: item && !item.is_veg ? 'nonveg' : 'veg',
    available: item?.is_available ?? true,
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    const price = Number(form.price)
    if (!form.name.trim()) next.name = 'Enter a name.'
    if (!form.categoryId) next.categoryId = 'Pick a group.'
    if (form.price.trim() === '' || Number.isNaN(price)) next.price = 'Enter a price.'
    else if (price < 0) next.price = "Price can't be less than 0."
    else if (price > 100000) next.price = 'This price looks too high.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await saveItem(item?.id, {
        name: form.name,
        categoryId: form.categoryId,
        price,
        isVeg: form.veg === 'veg',
        isAvailable: form.available,
      })
      toast.success('Saved')
      onSaved()
    } catch (err) {
      toast.error(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={item ? 'Edit item' : 'Add item'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="item-form" loading={busy}>Save</Button>
        </>
      }
    >
      <form id="item-form" onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} />
        <Field
          label="Group"
          options={groups.map((g) => ({ value: g.id, label: g.name }))}
          value={form.categoryId}
          onChange={set('categoryId')}
          error={errors.categoryId}
        />
        <Field
          label="Price (₹)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.price}
          onChange={set('price')}
          error={errors.price}
        />
        <Field label="Type" options={vegOptions} value={form.veg} onChange={set('veg')} />
        <div className="flex items-center justify-between">
          <span className="text-body font-medium">Available</span>
          <Switch checked={form.available} onChange={(v) => setForm((f) => ({ ...f, available: v }))} label="Available" />
        </div>
      </form>
    </Modal>
  )
}

export default function Menu() {
  const toast = useToast()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const canSoldOut = ['admin', 'captain', 'kitchen'].includes(role)

  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState(null)
  const [groupForm, setGroupForm] = useState(null) // null closed, {} new, group edit
  const [itemForm, setItemForm] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await listMenu())
      setFailed(false)
    } catch (err) {
      setFailed(true)
      toast.error(err.message)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  // Everyone but admin only sees what is turned on.
  const groups = useMemo(
    () => (data ? data.categories.filter((c) => isAdmin || c.is_active) : []),
    [data, isAdmin],
  )
  const current = groups.find((g) => g.id === selected) ?? groups[0]
  const items = useMemo(
    () =>
      data && current
        ? data.items.filter((i) => i.category_id === current.id && (isAdmin || i.is_active))
        : [],
    [data, current, isAdmin],
  )
  const activeGroups = groups.filter((g) => g.is_active)

  async function run(id, action, okText) {
    setPending(id)
    try {
      await action()
      if (okText) toast.success(okText)
      await load()
    } catch (err) {
      toast.error(err.message)
      await load()
    } finally {
      setPending(null)
    }
  }

  const nextOrder = data ? Math.max(0, ...data.categories.map((c) => c.sort_order)) + 1 : 1

  return (
    <main className="mx-auto max-w-3xl p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-title font-semibold">Menu</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={Plus} onClick={() => setGroupForm({})}>Group</Button>
            <Button icon={Plus} disabled={activeGroups.length === 0} onClick={() => setItemForm({})}>Item</Button>
          </div>
        )}
      </div>

      {data === null && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && data === null && (
        <EmptyState title="Couldn't load the menu" actionLabel="Try again" onAction={load} />
      )}

      {data && groups.length === 0 && (
        <div className="rounded-base bg-surface shadow-card">
          <EmptyState
            icon={BookOpen}
            title="No menu yet"
            actionLabel={isAdmin ? 'Add group' : undefined}
            onAction={isAdmin ? () => setGroupForm({}) : undefined}
          />
        </div>
      )}

      {data && groups.length > 0 && (
        <>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelected(g.id)}
                className={`h-10 shrink-0 rounded-full px-4 text-body font-medium shadow-card transition ${
                  g.id === current.id ? 'bg-primary text-on-primary' : 'bg-surface'
                } ${g.is_active ? '' : 'opacity-50'}`}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div className="rounded-base bg-surface shadow-card">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <h2 className="text-section font-semibold">
                {current.name}
                {!current.is_active && <span className="text-small font-normal text-muted"> · Turned off</span>}
              </h2>
              {isAdmin && (
                <div className="flex">
                  <IconButton icon={Pencil} label="Edit group" onClick={() => setGroupForm(current)} />
                  {current.is_active ? (
                    <IconButton
                      icon={Power}
                      label="Turn off group"
                      tone="danger"
                      onClick={() => setConfirm({ type: 'group', target: current })}
                    />
                  ) : (
                    <IconButton
                      icon={RotateCcw}
                      label="Turn on group"
                      disabled={pending === current.id}
                      onClick={() => run(current.id, () => setCategoryActive(current.id, true), 'Turned on')}
                    />
                  )}
                </div>
              )}
            </div>

            {items.length === 0 && (
              <EmptyState
                icon={BookOpen}
                title="No items here yet"
                actionLabel={isAdmin && current.is_active ? 'Add item' : undefined}
                onAction={isAdmin && current.is_active ? () => setItemForm({ defaultGroup: current.id }) : undefined}
              />
            )}

            {items.map((i) => {
              const off = !i.is_active || !current.is_active
              return (
                <div
                  key={i.id}
                  className={`flex items-center gap-3 border-t border-line px-4 py-3 ${off ? 'opacity-50' : ''}`}
                >
                  <span
                    title={i.is_veg ? 'Veg' : 'Non-veg'}
                    className={`size-3 shrink-0 rounded-full ${i.is_veg ? 'bg-success' : 'bg-danger'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium">{i.name}</p>
                    <p className="text-small text-muted">
                      {money(i.price)}
                      {!i.is_active && ' · Turned off'}
                      {i.is_active && !i.is_available && <span className="text-danger"> · Sold out</span>}
                    </p>
                  </div>
                  {canSoldOut && i.is_active && (
                    <Switch
                      checked={i.is_available}
                      label={i.is_available ? `Mark ${i.name} sold out` : `Mark ${i.name} available`}
                      disabled={pending === i.id}
                      onChange={(v) => run(i.id, () => setItemAvailable(i.id, v), v ? 'Marked available' : 'Marked sold out')}
                    />
                  )}
                  {isAdmin && (
                    <>
                      <IconButton icon={Pencil} label="Edit item" onClick={() => setItemForm(i)} />
                      {i.is_active ? (
                        <IconButton
                          icon={Power}
                          label="Turn off item"
                          tone="danger"
                          onClick={() => setConfirm({ type: 'item', target: i })}
                        />
                      ) : (
                        <IconButton
                          icon={RotateCcw}
                          label="Turn on item"
                          disabled={pending === i.id}
                          onClick={() => run(i.id, () => setItemActive(i.id, true), 'Turned on')}
                        />
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {groupForm && (
        <GroupForm
          group={groupForm.id ? groupForm : null}
          nextOrder={nextOrder}
          onClose={() => setGroupForm(null)}
          onSaved={() => { setGroupForm(null); load() }}
        />
      )}
      {itemForm && (
        <ItemForm
          item={itemForm.id ? itemForm : null}
          groups={activeGroups}
          defaultGroup={itemForm.defaultGroup ?? current?.id}
          onClose={() => setItemForm(null)}
          onSaved={() => { setItemForm(null); load() }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'group' ? 'Turn off this group?' : 'Turn off this item?'}
          message={
            confirm.type === 'group'
              ? `${confirm.target.name} and its items will be hidden from new orders. Old orders and bills stay the same.`
              : `${confirm.target.name} will be hidden from new orders. Old orders and bills stay the same.`
          }
          confirmLabel="Turn off"
          cancelLabel="Cancel"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const { type, target } = confirm
            setConfirm(null)
            await run(
              target.id,
              () => (type === 'group' ? setCategoryActive(target.id, false) : setItemActive(target.id, false)),
              'Turned off',
            )
          }}
        />
      )}
    </main>
  )
}
