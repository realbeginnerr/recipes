import type { ShopPolicies } from '../../types/shopPolicy'
import { withdrawalExceptionLabels } from '../../utils/shopPolicy'
import { CheckField, NumberField, SelectField, TextField } from './ProductFields'

type Props<K extends keyof ShopPolicies> = { value: ShopPolicies[K]; onChange: (value: ShopPolicies[K]) => void; errors?: Record<string, string> }
export function ShippingPolicyFields({ value, onChange, errors = {} }: Props<'shipping'>) {
  const update = <K extends keyof typeof value>(key: K, next: typeof value[K]) => onChange({ ...value, [key]: next })
  return <>
    <SelectField label="배송 유형" value={value.type} options={[{ value: 'parcel', label: '택배' }, { value: 'direct', label: '직접 배송' }, { value: 'pickup', label: '방문 수령' }, { value: 'none', label: '배송 없음' }]} onChange={next => update('type', next)} />
    {value.type !== 'none' && <>
      <SelectField label="배송 업체" value={['', 'CJ대한통운', '우체국택배', '롯데택배', '한진택배', '로젠택배'].includes(value.carrier) ? value.carrier : '직접 입력'} options={['', 'CJ대한통운', '우체국택배', '롯데택배', '한진택배', '로젠택배', '직접 입력'].map(carrier => ({ value: carrier, label: carrier || '선택 안 함' }))} onChange={next => update('carrier', next)} />
      {value.carrier === '직접 입력' || !['', 'CJ대한통운', '우체국택배', '롯데택배', '한진택배', '로젠택배'].includes(value.carrier) ? <TextField label="배송 업체명" value={value.carrier === '직접 입력' ? '' : value.carrier} onChange={next => update('carrier', next)} /> : null}
      <TextField label="출고지 주소" value={value.originAddress} onChange={next => update('originAddress', next)} />
      <NumberField label="출고 소요일" value={value.leadDays} onChange={next => update('leadDays', next)} unit="영업일" error={errors['shipping.leadDays']} />
      <TextField label="배송 가능 지역" value={value.regions} onChange={next => update('regions', next)} />
      <CheckField label="해외 배송 가능" value={value.international} onChange={next => update('international', next)} />
      <CheckField label="묶음 배송 가능" value={value.bundle} onChange={next => update('bundle', next)} />
      {value.type !== 'pickup' && <>
        <SelectField label="배송비 유형" value={value.feeType} options={[{ value: 'free', label: '무료' }, { value: 'paid', label: '유료' }, { value: 'conditional', label: '조건부 무료' }]} onChange={next => update('feeType', next)} />
        {value.feeType !== 'free' && <NumberField label="기본 배송비" value={value.fee} onChange={next => update('fee', next)} unit="원" required error={errors['shipping.fee']} />}
        {value.feeType === 'conditional' && <NumberField label="무료 배송 기준 금액" value={value.freeThreshold} onChange={next => update('freeThreshold', next)} unit="원" required error={errors['shipping.freeThreshold']} />}
        {(['jejuFee', 'remoteFee', 'quantityFee'] as const).map((key, index) => <NumberField key={key} label={['제주도 추가 배송비', '도서산간 추가 배송비', '수량별 추가 배송비'][index]} value={value[key]} onChange={next => update(key, next)} unit={key === 'quantityFee' ? '원 / 개' : '원'} error={errors[`shipping.${key}`]} />)}
        <CheckField label="상품별 개별 배송비 적용" value={value.individualFee} onChange={next => update('individualFee', next)} />
      </>}
      <TextField label="배송 예정 기간" value={value.estimatedDays} onChange={next => update('estimatedDays', next)} hint="예: 출고 후 1~3영업일" />
      <TextField label="주문 마감 시간" type="time" value={value.cutoffTime} onChange={next => update('cutoffTime', next)} />
      {(['holidays', 'delayNotice', 'guidance'] as const).map((key, index) => <TextField key={key} label={['주말·공휴일 배송 안내', '배송 지연 안내', '배송 추가 안내'][index]} multiline value={value[key]} onChange={next => update(key, next)} error={errors[`shipping.${key}`]} />)}
    </>}
  </>
}
export function ExchangePolicyFields({ value, onChange, errors = {} }: Props<'exchange'>) {
  const update = <K extends keyof typeof value>(key: K, next: typeof value[K]) => onChange({ ...value, [key]: next })
  return <>
    <CheckField label="단순 변심 교환 허용" value={value.enabled} onChange={next => update('enabled', next)} hint="이 설정은 불량·오배송 등에 대한 법정 권리를 제한하지 않아요." />
    {value.enabled && <NumberField label="교환 신청 가능 기간" value={value.days} onChange={next => update('days', next)} unit="일" error={errors['exchange.days']} />}
    <TextField label="교환 가능 사유" value={value.reasons} onChange={next => update('reasons', next)} multiline error={errors['exchange.reasons']} />
    <TextField label="교환 신청 방법" value={value.method} onChange={next => update('method', next)} multiline error={errors['exchange.method']} />
    <NumberField label="단순 변심 교환 배송비" value={value.changeFee} onChange={next => update('changeFee', next)} unit="원" error={errors['exchange.changeFee']} />
    <NumberField label="불량·오배송 고객 부담 교환비" value={0} onChange={() => {}} unit="원" disabled />
    <NumberField label="제주·도서산간 교환 추가 비용" value={value.remoteFee} onChange={next => update('remoteFee', next)} unit="원" error={errors['exchange.remoteFee']} />
    <SelectField label="단순 변심 교환비 부담" value={value.payer} options={[{ value: 'buyer', label: '구매자' }, { value: 'seller', label: '판매자' }]} onChange={next => update('payer', next)} />
    {(['collectionMethod', 'inspection', 'reshipping', 'guidance'] as const).map((key, index) => <TextField key={key} label={['교환 상품 회수 방법', '검수 안내', '재발송 안내', '교환 추가 안내'][index]} value={value[key]} onChange={next => update(key, next)} multiline error={errors[`exchange.${key}`]} />)}
  </>
}
export function RefundPolicyFields({ value, onChange, errors = {} }: Props<'refund'>) {
  const update = <K extends keyof typeof value>(key: K, next: typeof value[K]) => onChange({ ...value, [key]: next })
  return <>
    <NumberField label="일반 청약철회 신청 기간" value={value.days} onChange={next => update('days', next)} unit="일" required error={errors['refund.days']} />
    <p className="product-hint product-full">서면 수령·상품 공급 등 법정 기산일부터 최소 7일. 불량·오배송·표시 내용과 다른 경우에는 공급일부터 3개월 이내, 알게 된 날부터 30일 이내의 별도 권리가 적용돼요.</p>
    <TextField label="반품 가능 사유" value={value.reasons} onChange={next => update('reasons', next)} multiline error={errors['refund.reasons']} />
    <TextField label="반품 신청 방법" value={value.method} onChange={next => update('method', next)} multiline error={errors['refund.method']} />
    <NumberField label="단순 변심 반품 배송비" value={value.changeFee} onChange={next => update('changeFee', next)} unit="원" error={errors['refund.changeFee']} />
    <NumberField label="불량·오배송 고객 부담 반품비" value={0} onChange={() => {}} unit="원" disabled />
    <NumberField label="제주·도서산간 반품 추가 비용" value={value.remoteFee} onChange={next => update('remoteFee', next)} unit="원" error={errors['refund.remoteFee']} />
    <SelectField label="단순 변심 반품비 부담" value={value.payer} options={[{ value: 'buyer', label: '구매자' }, { value: 'seller', label: '판매자' }]} onChange={next => update('payer', next)} />
    <div className="product-full"><h3>청약철회 제한 조건</h3><p className="product-hint">상품이 실제로 해당하는 조건만 선택하세요. 식품이라는 이유만으로 일괄 반품을 금지할 수 없어요.</p>
      {Object.entries(withdrawalExceptionLabels).map(([key, label]) => <CheckField key={key} label={label} value={value.exceptions.includes(key as typeof value.exceptions[number])} onChange={checked => update('exceptions', checked ? [...value.exceptions, key as typeof value.exceptions[number]] : value.exceptions.filter(item => item !== key))} />)}
      {!!value.exceptions.length && <CheckField label="제한 사유를 고객이 쉽게 확인하도록 명확하게 고지할 예정" value={value.exceptionNotice} onChange={next => update('exceptionNotice', next)} />}
      {value.exceptions.includes('custom') && <CheckField label="주문 제작에 대한 별도 고지와 서면·전자 동의 절차 마련" value={value.customConsent} onChange={next => update('customConsent', next)} />}
      {['refund.exceptionNotice', 'refund.customConsent'].map(key => errors[key] && <p key={key} className="product-error">{errors[key]}</p>)}
    </div>
    <NumberField label="반환받은 날부터 환급 처리 기한" value={value.refundDays} onChange={next => update('refundDays', next)} unit="영업일" required error={errors['refund.refundDays']} />
    <TextField label="환불 수단" value="원결제 수단으로 환급·청구 취소 요청" onChange={() => {}} disabled />
    <CheckField label="부분 환불 허용" value={value.partial} onChange={next => update('partial', next)} />
    {(['collectionMethod', 'inspection', 'settlement', 'guidance'] as const).map((key, index) => <TextField key={key} label={['반품 상품 회수 방법', '반품 검수 안내', '배송비·할인 금액 정산 안내', '반품·환불 추가 안내'][index]} value={value[key]} onChange={next => update(key, next)} multiline error={errors[`refund.${key}`]} />)}
  </>
}
export function ReturnAddressFields({ value, onChange, errors = {} }: Props<'address'>) {
  return <>{(['recipient', 'phone', 'postcode', 'address', 'detail', 'carrier', 'notice', 'customerService'] as const).map((key, index) => <TextField key={key} label={['수령인·담당자', '연락처', '우편번호', '반품 주소', '상세 주소', '택배 회수 업체', '반품 접수 주의사항', '고객센터 연락처'][index]} value={value[key]} onChange={next => onChange({ ...value, [key]: next })} error={errors[`address.${key}`]} multiline={key === 'notice'} />)}</>
}
