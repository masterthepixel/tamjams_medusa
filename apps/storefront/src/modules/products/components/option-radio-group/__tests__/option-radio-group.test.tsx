import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import OptionRadioGroup, { RadioOption } from "../index"

const SIZE_OPTIONS: RadioOption[] = [
  { value: "8oz", label: "Small" },
  { value: "12oz", label: "Medium" },
  { value: "18oz", label: "Large" },
]

const Harness = ({
  options = SIZE_OPTIONS,
  initial = options[0].value,
  onChange,
}: {
  options?: RadioOption[]
  initial?: string
  onChange?: (value: string) => void
}) => {
  const [value, setValue] = useState(initial)
  return (
    <OptionRadioGroup
      title="Size"
      options={options}
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
    />
  )
}

const radio = (name: string) => screen.getByRole("radio", { name })

describe("OptionRadioGroup", () => {
  it("renders a labelled radiogroup with one radio per option", () => {
    render(<Harness />)
    const group = screen.getByRole("radiogroup", { name: "Size" })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(3)
  })

  it("marks only the selected option aria-checked", () => {
    render(<Harness initial="12oz" />)
    expect(radio("Small")).toHaveAttribute("aria-checked", "false")
    expect(radio("Medium")).toHaveAttribute("aria-checked", "true")
    expect(radio("Large")).toHaveAttribute("aria-checked", "false")
  })

  it("gives the selected option tabindex 0 and the rest -1 (roving tabindex)", async () => {
    const user = userEvent.setup()
    render(<Harness initial="8oz" />)
    expect(radio("Small")).toHaveAttribute("tabindex", "0")
    expect(radio("Medium")).toHaveAttribute("tabindex", "-1")
    expect(radio("Large")).toHaveAttribute("tabindex", "-1")

    await user.click(radio("Large"))
    expect(radio("Small")).toHaveAttribute("tabindex", "-1")
    expect(radio("Large")).toHaveAttribute("tabindex", "0")
  })

  it("selects on click", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(radio("Medium"))
    expect(onChange).toHaveBeenCalledWith("12oz")
    expect(radio("Medium")).toHaveAttribute("aria-checked", "true")
  })

  it.each([
    ["{ArrowRight}", "Small", "Medium"],
    ["{ArrowDown}", "Small", "Medium"],
    ["{ArrowLeft}", "Large", "Medium"],
    ["{ArrowUp}", "Large", "Medium"],
  ])("%s moves the selection", async (key, from, to) => {
    const user = userEvent.setup()
    render(<Harness initial={from === "Small" ? "8oz" : "18oz"} />)

    radio(from).focus()
    await user.keyboard(key)
    expect(radio(to)).toHaveAttribute("aria-checked", "true")
  })

  it("wraps from last to first on ArrowRight and first to last on ArrowLeft", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness initial="18oz" />)
    radio("Large").focus()
    await user.keyboard("{ArrowRight}")
    expect(radio("Small")).toHaveAttribute("aria-checked", "true")
    unmount()

    render(<Harness initial="8oz" />)
    radio("Small").focus()
    await user.keyboard("{ArrowLeft}")
    expect(radio("Large")).toHaveAttribute("aria-checked", "true")
  })

  it("selects the focused option on Space and Enter", async () => {
    const user = userEvent.setup()
    render(<Harness initial="8oz" />)

    radio("Large").focus()
    await user.keyboard("{Enter}")
    expect(radio("Large")).toHaveAttribute("aria-checked", "true")

    radio("Medium").focus()
    await user.keyboard(" ")
    expect(radio("Medium")).toHaveAttribute("aria-checked", "true")
  })

  it("does not select disabled options on click", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Harness
        options={[
          { value: "8oz", label: "Small" },
          { value: "12oz", label: "Medium", disabled: true },
          { value: "18oz", label: "Large" },
        ]}
        onChange={onChange}
      />
    )

    await user.click(radio("Medium"))
    expect(onChange).not.toHaveBeenCalled()
    expect(radio("Medium")).toHaveAttribute("aria-checked", "false")
    expect(radio("Small")).toHaveAttribute("aria-checked", "true")
  })

  it("renders disabled options with disabled semantics and line-through styling", () => {
    render(
      <Harness
        options={[
          { value: "8oz", label: "Small" },
          { value: "12oz", label: "Medium", disabled: true },
        ]}
      />
    )
    const disabledRadio = radio("Medium")
    expect(disabledRadio).toBeDisabled()
    expect(disabledRadio.className).toContain("line-through")
    expect(disabledRadio.className).toContain("cursor-not-allowed")
  })

  it("skips disabled options during arrow-key navigation", async () => {
    const user = userEvent.setup()
    render(
      <Harness
        options={[
          { value: "8oz", label: "Small" },
          { value: "12oz", label: "Medium", disabled: true },
          { value: "18oz", label: "Large" },
        ]}
        initial="8oz"
      />
    )

    radio("Small").focus()
    await user.keyboard("{ArrowRight}")
    expect(radio("Large")).toHaveAttribute("aria-checked", "true")
    expect(radio("Medium")).toHaveAttribute("aria-checked", "false")
  })

  it("carries the focus-visible ring classes for keyboard focus styling", () => {
    render(<Harness />)
    expect(radio("Small").className).toContain("focus-visible:ring-2")
  })
})
