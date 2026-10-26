import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, density = "default", ...props }: React.ComponentProps<"input"> & { density?: "default" | "compact" | "quantity" }) {
  const [focused, setFocused] = React.useState(false)
  // Keep the text being edited separate from the parent's parsed/clamped number.
  // Otherwise Number(''), ignored empty changes, or toFixed() can prevent clearing
  // a field or entering decimals. Blur returns to the screen's committed value.
  const [numericDraft, setNumericDraft] = React.useState<string | null>(null)
  const editableNumber = type === 'number' && props.value !== undefined && !props.readOnly && !props.disabled
  const numeric = type === 'number' && props.value !== '' && props.value !== undefined && props.value !== null
    ? Number(props.value) : NaN
  const displayValue = editableNumber && focused && numericDraft !== null
    ? numericDraft
    : !focused && Number.isFinite(numeric)
    ? new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 1 }).format(numeric)
    : props.value
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-density={density}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      value={displayValue}
      onFocus={event => {
        setFocused(true)
        if (editableNumber) setNumericDraft(String(props.value ?? ''))
        props.onFocus?.(event)
      }}
      onChange={event => {
        if (editableNumber) setNumericDraft(event.target.value)
        props.onChange?.(event)
      }}
      onBlur={event => {
        setFocused(false)
        setNumericDraft(null)
        props.onBlur?.(event)
      }}
    />
  )
}

export { Input }
