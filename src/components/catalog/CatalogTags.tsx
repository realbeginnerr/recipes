export function CatalogTags({ tags }: { tags: readonly { key: string; label: string }[] }) {
  if (!tags.length) return null
  return <div className="catalog-card-categories">{tags.map(tag => <span key={tag.key} className="catalog-category">{tag.label}</span>)}</div>
}
