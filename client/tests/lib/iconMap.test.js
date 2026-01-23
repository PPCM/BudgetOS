import { describe, it, expect } from 'vitest'
import iconMap, { getIconComponent } from '../../src/lib/iconMap'
import { Tag, Home, CreditCard, Briefcase } from 'lucide-react'

describe('iconMap', () => {
  it('exports a map of icon names to components', () => {
    expect(typeof iconMap).toBe('object')
    expect(Object.keys(iconMap).length).toBeGreaterThan(100)
  })

  it('contains expected category icons', () => {
    expect(iconMap.home).toBe(Home)
    expect(iconMap.creditcard).toBe(CreditCard)
    expect(iconMap.briefcase).toBe(Briefcase)
  })

  it('maps all keys to valid React components', () => {
    for (const [key, component] of Object.entries(iconMap)) {
      expect(typeof component).toBe('object', `Icon "${key}" should be a valid component`)
      expect(component.$$typeof).toBeDefined()
    }
  })
})

describe('getIconComponent', () => {
  it('returns Tag for null/undefined input', () => {
    expect(getIconComponent(null)).toBe(Tag)
    expect(getIconComponent(undefined)).toBe(Tag)
    expect(getIconComponent('')).toBe(Tag)
  })

  it('returns Tag for unknown icon names', () => {
    expect(getIconComponent('unknowniconname')).toBe(Tag)
    expect(getIconComponent('nonexistent')).toBe(Tag)
  })

  it('finds icons case-insensitively', () => {
    expect(getIconComponent('home')).toBe(Home)
    expect(getIconComponent('HOME')).toBe(Home)
    expect(getIconComponent('Home')).toBe(Home)
    expect(getIconComponent('HoMe')).toBe(Home)
  })

  it('handles icon names with special characters', () => {
    expect(getIconComponent('credit-card')).toBe(CreditCard)
    expect(getIconComponent('credit_card')).toBe(CreditCard)
    expect(getIconComponent('credit card')).toBe(CreditCard)
    expect(getIconComponent('CreditCard')).toBe(CreditCard)
  })

  it('returns correct icons for common category names', () => {
    expect(getIconComponent('briefcase')).toBe(Briefcase)
    expect(getIconComponent('home')).toBe(Home)
    expect(getIconComponent('creditcard')).toBe(CreditCard)
  })

  describe('icon aliases', () => {
    it('handles gamepad alias', () => {
      const gamepadIcon = getIconComponent('gamepad')
      const gamepad2Icon = getIconComponent('gamepad2')
      expect(gamepadIcon).toBe(gamepad2Icon)
    })

    it('handles flower alias', () => {
      const flowerIcon = getIconComponent('flower')
      const flower2Icon = getIconComponent('flower2')
      expect(flowerIcon).toBe(flower2Icon)
    })

    it('handles tree alias', () => {
      const treeIcon = getIconComponent('tree')
      const treepineIcon = getIconComponent('treepine')
      expect(treeIcon).toBe(treepineIcon)
    })

    it('handles icecream alias', () => {
      const icecreamIcon = getIconComponent('icecream')
      const icecream2Icon = getIconComponent('icecream2')
      expect(icecreamIcon).toBe(icecream2Icon)
    })

    it('handles wand alias', () => {
      const wandIcon = getIconComponent('wand')
      const wand2Icon = getIconComponent('wand2')
      expect(wandIcon).toBe(wand2Icon)
    })
  })
})
