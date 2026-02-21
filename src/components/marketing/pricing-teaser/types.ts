/**
 * Types for Pricing Teaser components
 */

export type TeaserPlan = {
  _id: string
  name: string
  price: string
  unit?: string
  isHighlighted: boolean
  isDisabled?: boolean
  description: string
  creditNote: string
}
