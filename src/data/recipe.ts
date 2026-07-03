import type { Recipe } from '../types'

export const recipes: Recipe[] = [
  {
    id: 'chili-con-carne',
    name: 'Chili Con Carne',
    nameKo: '칠리 콘 카네',
    imageUrl: '/recipes/Chili-Con-Carne.jpg',
    tasteRating: 4,
    timeRating: 4,
    items: [
      { ingredientId: 'ground-beef', defaultAmount: 500, defaultUnit: 'g' },
      { ingredientId: 'onion', defaultAmount: 1, defaultUnit: 'piece' },
      { ingredientId: 'garlic', defaultAmount: 4, defaultUnit: 'piece' },
      { ingredientId: 'kidney-beans', defaultAmount: 400, defaultUnit: 'g' },
      { ingredientId: 'diced-tomatoes', defaultAmount: 400, defaultUnit: 'g' },
      { ingredientId: 'tomato-paste', defaultAmount: 30, defaultUnit: 'g' },
      { ingredientId: 'beef-broth', defaultAmount: 250, defaultUnit: 'ml' },
      { ingredientId: 'chili-powder', defaultAmount: 15, defaultUnit: 'g' },
      { ingredientId: 'cumin', defaultAmount: 5, defaultUnit: 'g' },
      { ingredientId: 'olive-oil', defaultAmount: 15, defaultUnit: 'ml' },
      { ingredientId: 'salt', defaultAmount: 5, defaultUnit: 'g' },
      { ingredientId: 'black-pepper', defaultAmount: 2, defaultUnit: 'g' },
    ],
  },
]
