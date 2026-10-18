export const teaCategories = ['전체', '홍차', '녹차', '과일차', '혼합차', '카페인', '무카페인'];
export const teaCategoryEnglish = {
    전체: 'All', 홍차: 'Black tea', 녹차: 'Green tea', 과일차: 'Fruit tea', 혼합차: 'Blended tea',
    카페인: 'Caffeinated', 무카페인: 'Caffeine-free',
};
// The copied Earl Grey, lavender, and vanilla recipe uses a caffeinated black tea base.
const knownTeaTags = {
    'tea-Tm2NJxtbz7kzRt2aJfxg': ['홍차', '혼합차', '카페인'],
};
export function getTeaTags(recipe) {
    if (Array.isArray(recipe.teaTags)) {
        return [...new Set(recipe.teaTags.filter(tag => teaCategories.some(category => category !== '전체' && category === tag)))];
    }
    return knownTeaTags[recipe.id] ?? [];
}
