import { validWebUrl } from '../../utils/product'

export function ProductPurchaseLink({ href, label }: { href: string; label: string }) {
  if (!href || !validWebUrl(href)) return null
  return <a className="product-purchase-link" href={href} target="_blank" rel="noopener noreferrer">{label} <span className="sr-only">(외부 페이지, 새 탭)</span></a>
}
