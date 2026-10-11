import type { Product, ShopSettings } from '../types/product'
import type { ShopPolicies, WithdrawalException } from '../types/shopPolicy'

export const withdrawalExceptionLabels: Record<WithdrawalException, string> = {
  'consumer-damage': '소비자 책임으로 훼손·멸실 (내용 확인을 위한 포장 개봉 제외)',
  used: '사용·일부 소비로 가치가 현저히 감소한 경우',
  perishable: '시간 경과로 재판매가 곤란할 정도로 가치가 감소한 경우',
  custom: '개별 주문 제작: 철회 시 회복하기 어려운 중대한 피해가 예상되고 별도 고지·서면 동의한 경우',
}
export function emptyPolicies(): ShopPolicies {
  return {
    shipping: { type: 'parcel', carrier: '', originAddress: '', leadDays: null, regions: '', international: false, bundle: false, feeType: 'paid', fee: null, freeThreshold: null, jejuFee: null, remoteFee: null, quantityFee: null, individualFee: false, estimatedDays: '', cutoffTime: '', holidays: '', delayNotice: '', guidance: '' },
    exchange: { enabled: true, days: null, reasons: '', method: '', changeFee: null, defectFee: 0, remoteFee: null, payer: 'buyer', collectionMethod: '', inspection: '', reshipping: '', guidance: '' },
    refund: { enabled: true, days: null, reasons: '', method: '', changeFee: null, defectFee: 0, remoteFee: null, payer: 'buyer', exceptions: [], exceptionNotice: false, customConsent: false, collectionMethod: '', inspection: '', refundMethod: 'original', refundDays: null, partial: true, settlement: '', guidance: '' },
    address: { recipient: '', phone: '', postcode: '', address: '', detail: '', carrier: '', notice: '', customerService: '' },
  }
}
export function emptyShopSettings(): ShopSettings { return { version: 0, updatedAt: 0, categoryPaths: [], policies: emptyPolicies() } }
export function effectivePolicies(product: Product, settings: ShopSettings | null): ShopPolicies {
  return {
    shipping: product.policySelection.shipping === 'common' && settings ? settings.policies.shipping : product.policies.shipping,
    exchange: product.policySelection.exchange === 'common' && settings ? settings.policies.exchange : product.policies.exchange,
    refund: product.policySelection.refund === 'common' && settings ? settings.policies.refund : product.policies.refund,
    address: product.policySelection.refund === 'common' && settings ? settings.policies.address : product.policies.address,
  }
}
export function validatePolicies(policies: ShopPolicies, required = true): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [section, fields] of Object.entries(policies)) {
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'number' && (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 1e12)) errors[`${section}.${key}`] = '0 이상의 정수로 입력해 주세요.'
      if (required && value === null && ['days', 'refundDays'].includes(key) && !(section === 'exchange' && !policies.exchange.enabled)) errors[`${section}.${key}`] = '기간을 입력해 주세요.'
      if (typeof value === 'string' && /(반품|환불|청약철회)\s*(절대\s*)?(불가|불가능)|무조건.*(반품|환불).*불가/.test(value)) errors[`${section}.${key}`] = '법정 권리를 일괄 제한하는 문구는 사용할 수 없어요. 제한 사유는 아래 법정 예외 항목에서 지정해 주세요.'
    }
  }
  const refund = policies.refund
  if (refund.days !== null && refund.days < 7) errors['refund.days'] = '일반 청약철회 기간을 7일보다 짧게 설정할 수 없어요.'
  if (refund.refundDays !== null && refund.refundDays > 3) errors['refund.refundDays'] = '반환받은 날부터 환급 처리 기한은 3영업일 이내로 설정해 주세요.'
  if (refund.defectFee !== 0) errors['refund.defectFee'] = '상품 불량·오배송 반환 비용은 판매자가 부담해요. 고객 부담 금액은 0원이어야 해요.'
  if (policies.exchange.defectFee !== 0) errors['exchange.defectFee'] = '상품 불량·오배송 교환 비용은 판매자가 부담해요.'
  if (!refund.enabled) errors['refund.enabled'] = '일괄 반품 불가는 설정할 수 없어요. 반품은 허용하고 해당 상품의 법정 예외 조건을 지정해 주세요.'
  if (refund.exceptions.length && !refund.exceptionNotice) errors['refund.exceptionNotice'] = '철회 제한 사유를 상품에 명확히 고지할 예정인지 확인해 주세요.'
  if (refund.exceptions.includes('custom') && !refund.customConsent) errors['refund.customConsent'] = '주문 제작 예외는 별도 고지와 서면·전자 동의 절차를 마련한 경우에만 설정할 수 있어요.'
  const shipping = policies.shipping
  if (required && !['none', 'pickup'].includes(shipping.type)) {
    if (shipping.feeType !== 'free' && shipping.fee === null) errors['shipping.fee'] = '기본 배송비를 입력해 주세요.'
    if (shipping.feeType === 'conditional' && shipping.freeThreshold === null) errors['shipping.freeThreshold'] = '무료 배송 기준 금액을 입력해 주세요.'
  }
  if (required && (!policies.address.address.trim() || !policies.address.phone.trim())) errors['address.address'] = '반품 주소와 연락처를 입력해 주세요.'
  return errors
}
export function policySnapshotForOrder(product: Product, settings: ShopSettings | null) {
  return { productId: product.id, productVersion: product.version, policyVersion: settings?.version ?? product.policyVersion, capturedAt: Date.now(), policies: structuredClone(effectivePolicies(product, settings)) }
}
