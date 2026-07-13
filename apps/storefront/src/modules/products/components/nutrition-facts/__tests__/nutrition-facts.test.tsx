import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import NutritionFacts, { NutritionData } from "../index"

const nutrition: NutritionData = {
  servingSize: "1 Tbsp (17g)",
  servingsPerContainer: 20,
  calories: 35,
  fat: { total: 1, saturated: 0.5, trans: 0 },
  cholesterol: 2,
  sodium: 5,
  carbohydrates: {
    total: 9,
    fiber: 3,
    sugars: { total: 8, added: 7 },
  },
  protein: 4,
  vitamins: {
    vitaminD: "1%",
    calcium: "2%",
    iron: "3%",
    potassium: "4%",
  },
}

describe("NutritionFacts", () => {
  it("renders the header with serving size and servings per container", () => {
    render(<NutritionFacts nutrition={nutrition} />)
    expect(
      screen.getByRole("heading", { name: "Nutrition Facts" })
    ).toBeInTheDocument()
    expect(screen.getByText("20 servings per container")).toBeInTheDocument()
    expect(screen.getByText("Serving size")).toBeInTheDocument()
    expect(screen.getByText("1 Tbsp (17g)")).toBeInTheDocument()
  })

  it("renders calories prominently", () => {
    render(<NutritionFacts nutrition={nutrition} />)
    expect(screen.getByText("Calories")).toBeInTheDocument()
    expect(screen.getByText("35")).toBeInTheDocument()
  })

  it("renders fat, cholesterol, and sodium rows with units", () => {
    render(<NutritionFacts nutrition={nutrition} />)
    expect(screen.getByText("Total Fat")).toBeInTheDocument()
    expect(screen.getByText("1g")).toBeInTheDocument()
    expect(screen.getByText("Saturated Fat")).toBeInTheDocument()
    expect(screen.getByText("0.5g")).toBeInTheDocument()
    expect(screen.getByText("Trans Fat")).toBeInTheDocument()
    expect(screen.getByText("0g")).toBeInTheDocument()
    expect(screen.getByText("Cholesterol")).toBeInTheDocument()
    expect(screen.getByText("2mg")).toBeInTheDocument()
    expect(screen.getByText("Sodium")).toBeInTheDocument()
    expect(screen.getByText("5mg")).toBeInTheDocument()
  })

  it("renders carbohydrate, sugar, and protein rows", () => {
    render(<NutritionFacts nutrition={nutrition} />)
    expect(screen.getByText("Total Carbohydrate")).toBeInTheDocument()
    expect(screen.getByText("9g")).toBeInTheDocument()
    expect(screen.getByText("Dietary Fiber")).toBeInTheDocument()
    expect(screen.getByText("3g")).toBeInTheDocument()
    expect(screen.getByText("Total Sugars")).toBeInTheDocument()
    expect(screen.getByText("8g")).toBeInTheDocument()
    expect(screen.getByText("Includes 7g Added Sugars")).toBeInTheDocument()
    expect(screen.getByText("Protein")).toBeInTheDocument()
    expect(screen.getByText("4g")).toBeInTheDocument()
  })

  it("renders the vitamin footer", () => {
    render(<NutritionFacts nutrition={nutrition} />)
    expect(screen.getByText("Vitamin D")).toBeInTheDocument()
    expect(screen.getByText("1%")).toBeInTheDocument()
    expect(screen.getByText("Calcium")).toBeInTheDocument()
    expect(screen.getByText("2%")).toBeInTheDocument()
    expect(screen.getByText("Iron")).toBeInTheDocument()
    expect(screen.getByText("3%")).toBeInTheDocument()
    expect(screen.getByText("Potassium")).toBeInTheDocument()
    expect(screen.getByText("4%")).toBeInTheDocument()
  })
})
