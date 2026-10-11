import type { Product } from '../../types/product'
import { isExternalProduct, discountedPrice } from '../../utils/product'
import { GROUP_PURCHASE_URL } from '../../constants/shop'

export function FulfillmentPolicyPreview({ product }: { product: Product }) {
  if (isExternalProduct(product)) return <section className="product-policy-preview"><h2>구매·배송 안내</h2><p>이 페이지는 외부 판매처의 차 상품을 소개합니다. 주문과 결제는 연결된 판매처에서 진행하며, 배송·교환·반품·환불은 해당 판매처의 안내와 관련 법령에 따릅니다. 문의는 구매한 판매처로 접수해 주세요.</p></section>
  const participants = product.groupBuy?.participants ?? null
  const total = discountedPrice(product)
  return <div className="product-policy-preview">
    <section><h2>공동구매·소분 안내</h2><p>여러 종류의 차를 함께 구매하고, 각 차를 따로 소분해 보내드립니다. 차를 미리 섞어서 보내지 않으므로 안내된 배합량에 맞춰 직접 블렌딩해 주세요.</p><p>각 차의 실제 구매량과 구매 비용은 참여 인원수에 따라 균등하게 나눕니다. 총 4명이 참여하면 각 차를 각각 4등분하고 구매 비용도 각각 ¼씩 부담합니다. 별도의 포장비나 운영자 수익은 없습니다.</p><p>전체 원재료 구매 비용: {total === null ? '미정' : `${total.toLocaleString('en-US')}원`}</p>{participants && participants >= 2 && total !== null ? <p>참여자 {participants}명 · 1인 예상 부담금: {(total / participants).toLocaleString('en-US', { maximumFractionDigits: 2 })}원 + 개별 배송비</p> : <p>1인 부담금은 참여 인원 확정 후 안내합니다.</p>}<p>포장비 0원. 실제 구매 비용과 배분 내역을 공개하고, 정산 후 차액이 있으면 반환합니다.</p></section>
    <section><h3>배송 안내</h3><p>공동구매한 상품이 운영자 주소로 모두 도착한 날부터 2일 이내에 소분·포장하여 발송합니다.</p><p>편의점 반값택배로 보내며, 수령할 편의점 정보를 받아 배송합니다. 배송비는 포장 완료 후 실제 무게와 택배 요금에 따라 안내하며, 받는 분이 각각 부담합니다. 입고가 지연되면 변경된 일정을 안내합니다.</p><p>모집 미성립 또는 원재료 확보 불가로 진행하지 못하면 받은 금액을 전액 환불합니다.</p></section>
    <section><h3>교환·반품·환불 안내</h3><p>취소·교환·반품은 공동구매 연락처로 신청해 주세요. 반품 주소는 접수 시 안내합니다. 미개봉·미사용 상품의 단순 변심 반품은 수령 후 7일 이내 신청할 수 있으며, 반환 배송비는 참여자가 부담합니다.</p><p>오배송·누락·변질 등 제공 과정의 문제는 운영자가 확인하여 교환 또는 환불하며, 필요한 배송비는 운영자가 부담합니다.</p><p>사용·섭취 등으로 가치가 현저히 감소한 경우에는 관련 법령에 따라 단순 변심 반품이 제한될 수 있습니다. 상품 하자나 안내 내용과 다른 경우의 권리는 별도로 보장됩니다.</p><p>표시·계약 내용과 다른 경우 공급 후 3개월 이내이면서 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회할 수 있습니다.</p><p>반품 환불은 상품을 반환받은 날부터 3영업일 이내 처리합니다.</p><a href={GROUP_PURCHASE_URL} target="_blank" rel="noopener noreferrer">공동구매 문의</a></section>
  </div>
}
