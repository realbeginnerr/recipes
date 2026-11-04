import { useUiCopy } from '../../context/LanguageContext'
import type { ShopPolicies } from '../../types/shopPolicy'
import { withdrawalExceptionLabels } from '../../utils/shopPolicy'

export function PolicyPreview({ policies }: { policies: ShopPolicies }) {
  const copy = useUiCopy()
  const money = (value: number | null) => value === null ? copy('미정') : copy(`${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}원`)
  const { shipping, exchange, refund, address } = policies
  return <div className="product-policy-preview">
    <section><h3>{copy("배송 안내")}</h3>{shipping.type === 'none' ? <p>{copy("배송이 필요 없는 상품이에요.")}</p> : <>
      <p>{shipping.type === 'pickup' ? copy("방문 수령") : shipping.type === 'direct' ? copy("직접 배송") : copy("택배 배송")}{shipping.carrier && ` · ${copy(shipping.carrier)}`}{shipping.leadDays !== null && copy(` · 결제 완료 후 ${shipping.leadDays}영업일 이내 출고`)}</p>
      {shipping.type === 'pickup' && shipping.originAddress && <p>{copy("수령 장소 ")}{shipping.originAddress}</p>}
      {shipping.international && <p>{copy("해외 배송 가능 · 지역별 배송 조건은 고객센터에 문의하세요.")}</p>}
      {shipping.bundle && <p>{copy("묶음 배송이 가능해요.")}</p>}
      {shipping.type !== 'pickup' && <p>{shipping.feeType === 'free' ? copy("무료 배송") : copy(`기본 배송비 ${money(shipping.fee)}${shipping.feeType === 'conditional' ? copy(` · ${money(shipping.freeThreshold)} 이상 무료`) : ''}`)}{shipping.jejuFee !== null && copy(` · 제주 추가 ${money(shipping.jejuFee)}`)}{shipping.remoteFee !== null && copy(` · 도서산간 추가 ${money(shipping.remoteFee)}`)}</p>}
      {shipping.quantityFee !== null && <p>{copy("수량별 추가 배송비 ")}{money(shipping.quantityFee)} {copy(" / 개")}</p>}
      {[shipping.regions, shipping.estimatedDays, shipping.holidays, shipping.delayNotice, shipping.guidance].filter(Boolean).map((text, index) => <p key={index}>{copy(text)}</p>)}
      {shipping.cutoffTime && <p>{copy("주문 마감 ")}{shipping.cutoffTime}</p>}
    </>}</section>
    <section><h3>{copy("교환 안내")}</h3><p>{exchange.enabled ? copy(`단순 변심 교환은 ${exchange.days ?? copy("미정")}일 이내 신청할 수 있어요.`) : copy("단순 변심에 대한 별도의 교환 서비스는 제공하지 않아요. 법정 청약철회 권리는 보장돼요.")}</p><p>{copy("단순 변심 교환 배송비 ")}{money(exchange.changeFee)} · {exchange.payer === 'buyer' ? copy("구매자") : copy("판매자")} {copy(" 부담. 불량·오배송 비용은 판매자가 부담해요.")}</p>{exchange.remoteFee !== null && <p>{copy("제주·도서산간 교환 추가 비용 ")}{money(exchange.remoteFee)}</p>}{[exchange.reasons, exchange.method, exchange.collectionMethod, exchange.reshipping, exchange.guidance].filter(Boolean).map((text, index) => <p key={index}>{copy(text)}</p>)}</section>
    <section><h3>{copy("반품·환불 안내")}</h3><p>{copy("일반 청약철회는 계약 서면 수령·상품 공급 등 법정 기산일부터 ")}{refund.days ?? 7}{copy("일 이내 신청할 수 있어요. 표시·광고와 다르거나 계약과 다르게 이행된 경우 공급일부터 3개월 이내, 알게 된 날부터 30일 이내의 권리가 적용돼요.")}</p><p>{copy("단순 변심 반환 배송비 ")}{money(refund.changeFee)} · {refund.payer === 'buyer' ? copy("구매자") : copy("판매자")} {copy(" 부담. 불량·오배송 등 판매자 귀책 반환 비용은 판매자가 부담해요.")}</p>{refund.remoteFee !== null && <p>{copy("제주·도서산간 반품 추가 비용 ")}{money(refund.remoteFee)}</p>}<p>{copy("상품을 반환받은 날부터 ")}{refund.refundDays ?? 3}{copy("영업일 이내 환급 처리하고 원결제 수단의 청구 취소·환급을 요청해요.")}</p>{refund.exceptions.length > 0 && <><p>{copy("법정 요건과 고지·동의 요건을 충족하는 경우 아래 사유로 일반 청약철회가 제한될 수 있어요. 불량·오배송 등 별도 권리는 유지돼요.")}</p><ul>{refund.exceptions.map(reason => <li key={reason}>{copy(withdrawalExceptionLabels[reason])}</li>)}</ul></>}{[refund.reasons, refund.method, refund.collectionMethod, refund.settlement, refund.guidance].filter(Boolean).map((text, index) => <p key={index}>{copy(text)}</p>)}</section>
    <section><h3>{copy("반품 접수·고객센터")}</h3><p>{address.recipient} {address.phone}</p><p>{address.postcode && `(${address.postcode}) `}{address.address} {address.detail}</p>{address.carrier && <p>{copy("회수 업체 ")}{address.carrier}</p>}{address.notice && <p>{address.notice}</p>}{address.customerService && <p>{copy("고객센터 ")}{address.customerService}</p>}</section>
  </div>
}
