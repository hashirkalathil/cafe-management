import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Coffee, LogOut } from 'lucide-react'
import { ICON } from '../lib/ui'
import { linksFor, roleLabels } from '../lib/roles'
import { useAuth } from '../hooks/useAuth'
import { logOut } from '../services/auth'
import { getCafeName } from '../services/settings'
import IconButton from './IconButton'

// Side bar on desktop, bottom bar on phone. Shows only the links this role can use.
export default function Sidebar() {
  const { profile, role } = useAuth()
  const links = linksFor(role)
  const [cafeName, setCafeName] = useState('')

  useEffect(() => {
    getCafeName().then(setCafeName)
  }, [])

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col bg-primary p-4 text-on-primary lg:flex">
        <div className="flex items-center gap-2 px-3 py-4">
          <Coffee className="size-6" />
          <span className="min-w-0 truncate text-title font-semibold">{cafeName || 'My cafe'}</span>
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-base px-3 text-body font-medium transition ${
                  isActive ? 'bg-primary-dark' : 'hover:bg-primary-dark/60'
                }`
              }
            >
              <Icon className={ICON} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 rounded-base bg-linear-to-b from-accent-light to-accent p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold">{profile.full_name}</p>
            <p className="text-small">{roleLabels[role]}</p>
          </div>
          <IconButton
            icon={LogOut}
            label="Log out"
            placement="top"
            onClick={logOut}
            className="text-on-primary hover:bg-primary-dark/40 hover:text-on-primary"
          />
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto bg-primary text-on-primary shadow-pop lg:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-18 flex-1 flex-col items-center gap-1 px-2 py-2 text-small transition ${
                isActive ? 'bg-primary-dark font-semibold' : ''
              }`
            }
          >
            <Icon className={ICON} />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={logOut}
          className="flex min-w-18 flex-1 flex-col items-center gap-1 px-2 py-2 text-small"
        >
          <LogOut className={ICON} />
          Log out
        </button>
      </nav>
    </>
  )
}
