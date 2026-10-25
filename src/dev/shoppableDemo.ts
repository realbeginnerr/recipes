import type { Recipe } from '../types'
import type { TaggedProduct } from '../types/shoppable'
const asset = (name: string) => new URL(`${import.meta.env.BASE_URL}images/recipes/${encodeURIComponent(name)}`, window.location.origin).href
const photo = asset('새우 토마토 스크램블 덮밥.png')
const second = asset('soybeansoup (1).png')
const third = asset('soybeansoup (3).png')
export const demoProducts: Record<string, TaggedProduct> = {
  '__demo-cup': { id: '__demo-cup', productName: '테스트 컵 — 구매 링크는 example.com으로 이동합니다', brandName: '개발 전용 샘플', thumbnailUrl: photo, productUrl: 'https://example.com/?shoppable-demo=cup', price: 12000, deleted: false, updatedAt: 0 },
  '__demo-plate': { id: '__demo-plate', productName: '테스트 접시: 가장자리 팝오버와 긴 상품명 줄바꿈을 확인하는 샘플 상품', brandName: '개발 전용 샘플', thumbnailUrl: second, productUrl: 'https://example.com/?shoppable-demo=plate', deleted: false, updatedAt: 0 },
}
export const demoRecipe: Recipe = {
  id: '__shoppable-demo__', name: 'Shoppable image demo', nameKo: '상품 태그 테스트 · 개발 전용', imageUrl: photo, imageUrls: [second, third],
  images: [{ id: 'demo-photo-1', url: photo }, { id: 'demo-photo-2', url: second }, { id: 'demo-photo-3', url: third }],
  productTags: [
    { id: 'center', imageId: 'demo-photo-1', productId: '__demo-cup', positionX: 50, positionY: 45 },
    { id: 'left-edge', imageId: 'demo-photo-1', productId: '__demo-plate', positionX: 1, positionY: 5 },
    { id: 'right-edge', imageId: 'demo-photo-1', productId: '__demo-plate', positionX: 99, positionY: 95 },
    { id: 'second-photo', imageId: 'demo-photo-2', productId: '__demo-cup', positionX: 75, positionY: 25 },
  ], items: [], memo: '로컬 테스트 데이터입니다. 사진 1: 태그 3개 / 사진 2: 태그 1개 / 사진 3: 태그 없음. 실제 상품이나 구매 기능이 아닙니다.',
}
