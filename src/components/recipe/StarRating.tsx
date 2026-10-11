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
        const icon = <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
          <path d="M0 0h24v24H0z" fill="none" />
          {star <= value ? <path fill="currentColor" d="M12.865 2.996a1 1 0 0 0-1.73 0L8.421 7.674a1.25 1.25 0 0 1-.894.608L2.44 9.05c-.854.13-1.154 1.208-.488 1.76l3.789 3.138c.35.291.515.75.43 1.197L5.18 20.35a1 1 0 0 0 1.448 1.072l4.79-2.522a1.25 1.25 0 0 1 1.164 0l4.79 2.522a1 1 0 0 0 1.448-1.072l-.991-5.205a1.25 1.25 0 0 1 .43-1.197l3.79-3.139c.665-.55.365-1.63-.49-1.759l-5.085-.768a1.25 1.25 0 0 1-.895-.608z" /> : <path fill="currentColor" fillRule="evenodd" d="M10.486 4.114c.675-1.162 2.353-1.162 3.028 0l2.065 3.56c.19.328.52.551.895.608l3.43.518c1.494.226 2.018 2.114.854 3.078l-2.499 2.07a1.25 1.25 0 0 0-.43 1.197l.7 3.676c.274 1.44-1.238 2.558-2.535 1.876L12.582 18.9a1.25 1.25 0 0 0-1.164 0l-3.412 1.797c-1.297.683-2.809-.436-2.535-1.876l.7-3.676a1.25 1.25 0 0 0-.43-1.197l-2.5-2.07c-1.163-.964-.64-2.852.856-3.078l3.43-.518a1.25 1.25 0 0 0 .894-.609zm1.73.753a.25.25 0 0 0-.432 0l-2.066 3.56a2.75 2.75 0 0 1-1.967 1.338l-3.43.518a.25.25 0 0 0-.122.44l2.499 2.07a2.75 2.75 0 0 1 .947 2.632l-.7 3.676a.25.25 0 0 0 .362.268l3.412-1.796a2.75 2.75 0 0 1 2.562 0l3.412 1.796a.25.25 0 0 0 .362-.268l-.7-3.676a2.75 2.75 0 0 1 .947-2.632l2.5-2.07a.25.25 0 0 0-.123-.44l-3.43-.518a2.75 2.75 0 0 1-1.967-1.339z" clipRule="evenodd" />}
        </svg>
        return onChange ? (
          <button key={star} type="button" className={className} aria-label={`${label}: ${star} / 5`} onClick={() => onChange(star)}>
            {icon}
          </button>
        ) : (
          <span key={star} className={className} aria-hidden="true">{icon}</span>
        )
      })}
    </div>
  )
}
