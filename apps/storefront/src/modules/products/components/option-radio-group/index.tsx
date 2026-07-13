"use client"

import { clx } from "@modules/common/components/ui"
import { useId } from "react"

export type RadioOption = {
  value: string
  label: string
  disabled?: boolean
}

type OptionRadioGroupProps = {
  title: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  "data-testid"?: string
}

/**
 * Accessible single-select control rendered as a WAI-ARIA radiogroup:
 * roving tabindex, arrow-key navigation, visible focus ring. Presentational —
 * the parent owns selection state.
 */
const OptionRadioGroup: React.FC<OptionRadioGroupProps> = ({
  title,
  options,
  value,
  onChange,
  "data-testid": dataTestId,
}) => {
  const labelId = useId()

  const enabled = options.filter((o) => !o.disabled)

  const move = (currentValue: string, dir: 1 | -1) => {
    if (enabled.length === 0) return
    const idx = enabled.findIndex((o) => o.value === currentValue)
    const base = idx === -1 ? 0 : idx
    const next = enabled[(base + dir + enabled.length) % enabled.length]
    onChange(next.value)
  }

  const onKeyDown = (e: React.KeyboardEvent, optionValue: string) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault()
        move(optionValue, 1)
        break
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault()
        move(optionValue, -1)
        break
      case " ":
      case "Enter":
        e.preventDefault()
        onChange(optionValue)
        break
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <span id={labelId} className="text-sm font-medium text-ui-fg-base">
        {title}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-2"
        data-testid={dataTestId}
      >
        {options.map((o) => {
          const checked = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={o.label}
              disabled={o.disabled}
              tabIndex={checked ? 0 : -1}
              onClick={() => !o.disabled && onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, o.value)}
              data-testid="option-radio"
              className={clx(
                "min-w-[4rem] flex-1 rounded-rounded border p-2 text-sm transition-shadow duration-150 ease-in-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-fg-interactive focus-visible:ring-offset-2",
                {
                  "border-ui-border-interactive bg-ui-bg-base font-medium":
                    checked && !o.disabled,
                  "border-ui-border-base bg-ui-bg-subtle hover:shadow-elevation-card-rest":
                    !checked && !o.disabled,
                  "cursor-not-allowed border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted line-through opacity-60":
                    o.disabled,
                }
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionRadioGroup
