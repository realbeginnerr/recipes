# Shop temporary pause

2026-10-26: Shop is temporarily unused at the user's request.

`src/constants/shopFeatures.ts` is the shared switch for:

- Desktop and mobile Shop navigation links.
- Automatic thumbnail product cards below the recipe detail photo gallery.

Keep `shopFeatures.enabled = false` during the pause. The recipe detail title
“사진 속 상품” remains visible, including photos without product tags. This
space displays the recipe's `photoProductDescription`: a temporary multiline
text field edited under “사진 속 상품” in the recipe editor. HTTP/HTTPS URLs
become purchase links; HTML is displayed as text. Do not hide the title during
the pause. The description applies to the recipe and remains when switching
photos.

The separate `photoProductUrl` field accepts an HTTP/HTTPS purchase URL and
renders a “상품 구매하기” button opening a new tab with `noopener noreferrer`.
Its editor field and detail button are also hidden when Shop is restored.

When asked to show Shop navigation again, set `shopFeatures.enabled` to `true`.
This restores both navigation and automatic photo product cards together, and
hides the temporary description field and its detail-page display. Stored
description text is retained. The product tag editor also replaces the
temporary description editor automatically.
Review any temporary names and links added during the pause before restoring
the automatic cards, to avoid duplicate content. Product data and routes remain
available throughout the pause.

Verification: `tests/RelatedImageProducts.test.tsx` covers the paused title-only
state and the restored automatic product list.
