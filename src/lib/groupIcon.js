import { CupSoda, IceCreamCone, Pizza, Sandwich, Soup, Utensils } from 'lucide-react'

// Picks a picture for a menu group from its name.
export function groupIcon(name = '') {
  const n = name.toLowerCase()
  if (/starter|snack/.test(n)) return Soup
  if (/pizza|pasta/.test(n)) return Pizza
  if (/burger|wrap|sandwich/.test(n)) return Sandwich
  if (/drink|beverage|shake|coffee|tea/.test(n)) return CupSoda
  if (/dessert|sweet|ice/.test(n)) return IceCreamCone
  return Utensils
}
