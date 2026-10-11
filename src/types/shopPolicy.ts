export type ShippingPolicy = {
  type: 'parcel' | 'direct' | 'pickup' | 'none'; carrier: string; originAddress: string
  leadDays: number | null; regions: string; international: boolean; bundle: boolean
  feeType: 'free' | 'paid' | 'conditional'; fee: number | null; freeThreshold: number | null
  jejuFee: number | null; remoteFee: number | null; quantityFee: number | null; individualFee: boolean
  estimatedDays: string; cutoffTime: string; holidays: string; delayNotice: string; guidance: string
}
export type WithdrawalException = 'consumer-damage' | 'used' | 'perishable' | 'custom'
export type ExchangePolicy = {
  enabled: boolean; days: number | null; reasons: string; method: string
  changeFee: number | null; defectFee: number; remoteFee: number | null; payer: 'buyer' | 'seller'
  collectionMethod: string; inspection: string; reshipping: string; guidance: string
}
export type RefundPolicy = {
  enabled: boolean; days: number | null; reasons: string; method: string
  changeFee: number | null; defectFee: number; remoteFee: number | null; payer: 'buyer' | 'seller'
  exceptions: WithdrawalException[]; exceptionNotice: boolean; customConsent: boolean
  collectionMethod: string; inspection: string; refundMethod: 'original'; refundDays: number | null
  partial: boolean; settlement: string; guidance: string
}
export type ReturnAddress = { recipient: string; phone: string; postcode: string; address: string; detail: string; carrier: string; notice: string; customerService: string }
export type ShopPolicies = { shipping: ShippingPolicy; exchange: ExchangePolicy; refund: RefundPolicy; address: ReturnAddress }
export type PolicySelection = { shipping: 'common' | 'individual'; exchange: 'common' | 'individual'; refund: 'common' | 'individual' }
