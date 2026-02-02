/**
 * Types for Pricing Teaser components
 */

export type TeaserPlan = {
  _id: string
  name: string
  price: string
  unit?: string
  isHighlighted: boolean
  description: string
  creditNote: string
}
