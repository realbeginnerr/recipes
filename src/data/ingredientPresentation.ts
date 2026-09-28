// Presentation references from the published design; nutrition comes from our ingredient data.
const base = import.meta.env.BASE_URL

export const ingredientPresentation: Record<string, { image: string; category: string }> = {
  "양파": {
    "image": `${base}images/양파.jpg`,
    "category": "채소류"
  },
  "가지": {
    "image": `${base}images/가지.jpg`,
    "category": "채소류"
  },
  "감자": {
    "image": `${base}images/감자.jpg`,
    "category": "탄수화물"
  },
  "고등어": {
    "image": `${base}images/고등어.jpg`,
    "category": "기타"
  },
  "고춧가루": {
    "image": `${base}images/고춧가루.jpg`,
    "category": "기타"
  },
  "밀가루": {
    "image": `${base}images/밀가루.jpg`,
    "category": "탄수화물"
  },
  "닭가슴살": {
    "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "고기류"
  },
  "연어": {
    "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "두부": {
    "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "현미": {
    "image": "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "계란": {
    "image": `${base}images/계란.jpg`,
    "category": "기타"
  },
  "소고기": {
    "image": "https://images.unsplash.com/photo-1588347785102-2944a9f9e8c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "고기류"
  },
  "브로콜리": {
    "image": "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "채소류"
  },
  "고구마": {
    "image": `${base}images/고구마.jpg`,
    "category": "채소류"
  },
  "아보카도": {
    "image": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "채소류"
  },
  "참치": {
    "image": "https://images.unsplash.com/photo-1571167366136-b57e973b7c39?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "퀴노아": {
    "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "그릭 요거트": {
    "image": "https://images.unsplash.com/photo-1488477181946-6428a0291777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "황태": {
    "image": "https://images.unsplash.com/photo-1534482421-64566f976cfa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "미역": {
    "image": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "채소류"
  },
  "새우": {
    "image": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "기타"
  },
  "검은콩": {
    "image": "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    "category": "채소류"
  }
}
