import type { Recipe } from '../types'

export const recipes: Recipe[] = [
  {
    id: 'chili-con-carne',
    name: 'Chili Con Carne',
    nameKo: '칠리 콘 카네',
    imageUrl:
      'https://images.unsplash.com/photo-1599974179268-309c3ef1c467?w=800&auto=format&fit=crop',
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
  {
    id: 'garlic-bread',
    name: 'Garlic Bread',
    nameKo: '마늘 빵',
    imageUrl:
      'https://images.unsplash.com/photo-1573140248131-840b1a03b81d?w=800&auto=format&fit=crop',
    items: [
      { ingredientId: 'olive-oil', defaultAmount: 20, defaultUnit: 'ml' },
      { ingredientId: 'garlic', defaultAmount: 3, defaultUnit: 'piece' },
      { ingredientId: 'salt', defaultAmount: 3, defaultUnit: 'g' },
      { ingredientId: 'black-pepper', defaultAmount: 1, defaultUnit: 'g' },
    ],
  },
]
