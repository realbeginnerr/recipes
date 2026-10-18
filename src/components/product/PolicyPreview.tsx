import type { ShopPolicies } from '../../types/shopPolicy'
import { withdrawalExceptionLabels } from '../../utils/shopPolicy'

const money = (value: number | null) => value === null ? '미정' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}원`
export function PolicyPreview({ policies }: { policies: ShopPolicies }) {
  const { shipping, exchange, refund, address } = policies
  return <div className="product-policy-preview">
    <section><h3>배송 안내</h3>{shipping.type === 'none' ? <p>배송이 필요 없는 상품이에요.</p> : <>
      <p>{shipping.type === 'pickup' ? '방문 수령' : shipping.type === 'direct' ? '직접 배송' : '택배 배송'}{shipping.carrier && ` · ${shipping.carrier}`}{shipping.leadDays !== null && ` · 결제 완료 후 ${shipping.leadDays}영업일 이내 출고`}</p>
      {shipping.type === 'pickup' && shipping.originAddress && <p>수령 장소 {shipping.originAddress}</p>}
      {shipping.international && <p>해외 배송 가능 · 지역별 배송 조건은 고객센터에 문의하세요.</p>}
      {shipping.bundle && <p>묶음 배송이 가능해요.</p>}
      {shipping.type !== 'pickup' && <p>{shipping.feeType === 'free' ? '무료 배송' : `기본 배송비 ${money(shipping.fee)}${shipping.feeType === 'conditional' ? ` · ${money(shipping.freeThreshold)} 이상 무료` : ''}`}{shipping.jejuFee !== null && ` · 제주 추가 ${money(shipping.jejuFee)}`}{shipping.remoteFee !== null && ` · 도서산간 추가 ${money(shipping.remoteFee)}`}</p>}
      {shipping.quantityFee !== null && <p>수량별 추가 배송비 {money(shipping.quantityFee)} / 개</p>}
      {[shipping.regions, shipping.estimatedDays, shipping.holidays, shipping.delayNotice, shipping.guidance].filter(Boolean).map((text, index) => <p key={index}>{text}</p>)}
      {shipping.cutoffTime && <p>주문 마감 {shipping.cutoffTime}</p>}
    </>}</section>
    <section><h3>교환 안내</h3><p>{exchange.enabled ? `단순 변심 교환은 ${exchange.days ?? '미정'}일 이내 신청할 수 있어요.` : '단순 변심에 대한 별도의 교환 서비스는 제공하지 않아요. 법정 청약철회 권리는 보장돼요.'}</p><p>단순 변심 교환 배송비 {money(exchange.changeFee)} · {exchange.payer === 'buyer' ? '구매자' : '판매자'} 부담. 불량·오배송 비용은 판매자가 부담해요.</p>{exchange.remoteFee !== null && <p>제주·도서산간 교환 추가 비용 {money(exchange.remoteFee)}</p>}{[exchange.reasons, exchange.method, exchange.collectionMethod, exchange.reshipping, exchange.guidance].filter(Boolean).map((text, index) => <p key={index}>{text}</p>)}</section>
    <section><h3>반품·환불 안내</h3><p>일반 청약철회는 계약 서면 수령·상품 공급 등 법정 기산일부터 {refund.days ?? 7}일 이내 신청할 수 있어요. 표시·광고와 다르거나 계약과 다르게 이행된 경우 공급일부터 3개월 이내, 알게 된 날부터 30일 이내의 권리가 적용돼요.</p><p>단순 변심 반환 배송비 {money(refund.changeFee)} · {refund.payer === 'buyer' ? '구매자' : '판매자'} 부담. 불량·오배송 등 판매자 귀책 반환 비용은 판매자가 부담해요.</p>{refund.remoteFee !== null && <p>제주·도서산간 반품 추가 비용 {money(refund.remoteFee)}</p>}<p>상품을 반환받은 날부터 {refund.refundDays ?? 3}영업일 이내 환급 처리하고 원결제 수단의 청구 취소·환급을 요청해요.</p>{refund.exceptions.length > 0 && <><p>법정 요건과 고지·동의 요건을 충족하는 경우 아래 사유로 일반 청약철회가 제한될 수 있어요. 불량·오배송 등 별도 권리는 유지돼요.</p><ul>{refund.exceptions.map(reason => <li key={reason}>{withdrawalExceptionLabels[reason]}</li>)}</ul></>}{[refund.reasons, refund.method, refund.collectionMethod, refund.settlement, refund.guidance].filter(Boolean).map((text, index) => <p key={index}>{text}</p>)}</section>
    <section><h3>반품 접수·고객센터</h3><p>{address.recipient} {address.phone}</p><p>{address.postcode && `(${address.postcode}) `}{address.address} {address.detail}</p>{address.carrier && <p>회수 업체 {address.carrier}</p>}{address.notice && <p>{address.notice}</p>}{address.customerService && <p>고객센터 {address.customerService}</p>}</section>
  </div>
}
