export type NutritionData = {
  servingSize: string
  servingsPerContainer: number
  calories: number
  fat: { total: number; saturated: number; trans: number }
  cholesterol: number
  sodium: number
  carbohydrates: {
    total: number
    fiber: number
    sugars: { total: number; added: number }
  }
  protein: number
  vitamins: {
    vitaminD: string
    calcium: string
    iron: string
    potassium: string
  }
}

const Row: React.FC<{
  label: string
  value: string
  indent?: boolean
  bold?: boolean
}> = ({ label, value, indent, bold }) => (
  <div
    className={`flex justify-between border-b border-ui-border-base py-1 text-sm ${
      bold ? "font-semibold" : ""
    } ${indent ? "pl-4" : ""}`}
  >
    <span>{label}</span>
    <span>{value}</span>
  </div>
)

const NutritionFacts: React.FC<{ nutrition: NutritionData }> = ({
  nutrition,
}) => {
  return (
    <div
      className="w-full rounded-large border border-ui-border-base p-4"
      data-testid="nutrition-facts"
    >
      <h3 className="mb-1 text-lg font-bold">Nutrition Facts</h3>
      <div className="border-b-4 border-ui-fg-base pb-1 text-sm">
        <div>{nutrition.servingsPerContainer} servings per container</div>
        <div className="flex justify-between font-semibold">
          <span>Serving size</span>
          <span>{nutrition.servingSize}</span>
        </div>
      </div>
      <div className="flex items-end justify-between border-b-4 border-ui-fg-base py-1">
        <span className="font-bold">Calories</span>
        <span className="text-2xl font-bold">{nutrition.calories}</span>
      </div>
      <Row label="Total Fat" value={`${nutrition.fat.total}g`} bold />
      <Row label="Saturated Fat" value={`${nutrition.fat.saturated}g`} indent />
      <Row label="Trans Fat" value={`${nutrition.fat.trans}g`} indent />
      <Row label="Cholesterol" value={`${nutrition.cholesterol}mg`} bold />
      <Row label="Sodium" value={`${nutrition.sodium}mg`} bold />
      <Row
        label="Total Carbohydrate"
        value={`${nutrition.carbohydrates.total}g`}
        bold
      />
      <Row
        label="Dietary Fiber"
        value={`${nutrition.carbohydrates.fiber}g`}
        indent
      />
      <Row
        label="Total Sugars"
        value={`${nutrition.carbohydrates.sugars.total}g`}
        indent
      />
      <Row
        label={`Includes ${nutrition.carbohydrates.sugars.added}g Added Sugars`}
        value=""
        indent
      />
      <Row label="Protein" value={`${nutrition.protein}g`} bold />
      <div className="mt-2 border-t-4 border-ui-fg-base pt-1">
        <Row label="Vitamin D" value={nutrition.vitamins.vitaminD} />
        <Row label="Calcium" value={nutrition.vitamins.calcium} />
        <Row label="Iron" value={nutrition.vitamins.iron} />
        <Row label="Potassium" value={nutrition.vitamins.potassium} />
      </div>
    </div>
  )
}

export default NutritionFacts
