import {
  LayoutDashboard, LayoutGrid, ChefHat, Receipt, BookOpen, Wallet, BarChart3, Users, Settings,
} from 'lucide-react'

export const roleLabels = {
  admin: 'Admin',
  captain: 'Captain',
  kitchen: 'Kitchen',
  billing: 'Billing',
}

export const roleHome = {
  admin: '/dashboard',
  captain: '/tables',
  kitchen: '/kitchen',
  billing: '/bills',
}

// Who may open which page (docs/PAGES.md). Admin can open everything.
export const pageRoles = {
  dashboard: ['admin'],
  tables: ['admin', 'captain', 'billing'],
  newOrder: ['admin', 'captain'],
  orderDetails: ['admin', 'captain', 'billing'],
  kitchen: ['admin', 'kitchen'],
  bills: ['admin', 'billing'],
  menu: ['admin', 'captain', 'kitchen', 'billing'],
  expenses: ['admin'],
  reports: ['admin'],
  staff: ['admin'],
  settings: ['admin'],
}

// Menu links, in order. Each shows only to the roles listed for its page.
export const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { to: '/tables', label: 'Tables', icon: LayoutGrid, page: 'tables' },
  { to: '/kitchen', label: 'Kitchen', icon: ChefHat, page: 'kitchen' },
  { to: '/bills', label: 'Bills', icon: Receipt, page: 'bills' },
  { to: '/menu', label: 'Menu', icon: BookOpen, page: 'menu' },
  { to: '/expenses', label: 'Expenses', icon: Wallet, page: 'expenses' },
  { to: '/reports', label: 'Reports', icon: BarChart3, page: 'reports' },
  { to: '/staff', label: 'Staff', icon: Users, page: 'staff' },
  { to: '/settings', label: 'Settings', icon: Settings, page: 'settings' },
]

export const linksFor = (role) => navLinks.filter((l) => pageRoles[l.page].includes(role))
