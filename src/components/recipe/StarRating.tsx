type StarRatingProps = {
  label: string
  value: number
  onChange?: (value: number) => void
  showLabel?: boolean
}

export function StarRating({ label, value, onChange, showLabel = true }: StarRatingProps) {
  return (
    <div className="star-rating" role={onChange ? undefined : 'img'} aria-label={onChange ? undefined : `${label}: ${value} / 5`}>
      {showLabel && <span className="star-rating__label">{label}</span>}
      {[1, 2, 3, 4, 5].map(star => {
        const className = `star-rating__star${star <= value ? ' star-rating__star--filled' : ''}`
        return onChange ? (
          <button key={star} type="button" className={className} onClick={() => onChange(star)}>
            ★
          </button>
        ) : (
          <span key={star} className={className} aria-hidden="true">★</span>
        )
      })}
    </div>
  )
}
