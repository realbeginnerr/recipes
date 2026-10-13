import { validWebUrl } from '../../utils/product'

export function ProductPurchaseLink({ href, label, disabled = false }: { href: string; label: string; disabled?: boolean }) {
  if (disabled || !href || !validWebUrl(href)) return <button type="button" className="product-purchase-link" disabled>{label}</button>
  return <a className="product-purchase-link" href={href} target="_blank" rel="noopener noreferrer">{label} <span className="sr-only">(외부 페이지, 새 탭)</span></a>
}
