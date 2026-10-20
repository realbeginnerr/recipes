export const MEAL_TARGET = { carbs: 60, protein: 35, fat: 20 } as const
export const MEAL_TARGET_KCAL = MEAL_TARGET.carbs * 4 + MEAL_TARGET.protein * 4 + MEAL_TARGET.fat * 9
