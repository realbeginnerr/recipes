# Shoppable images — stage 1

## Storage

- `recipes/{id}.images`: ordered `{ id, url }` records for main gallery photos.
- `recipes/{id}.productTags`: `{ id, imageId, productId, positionX, positionY }` records. Coordinates are percentages from 0 through 100 of the original image.
- `taggedProducts/{id}`: shared product information (`productName`, optional `brandName`, `thumbnailUrl`, `productUrl`, optional `price`, `deleted`, `updatedAt`). Price is in KRW, consistent with the current site.
- Product information is never copied into a recipe. Future rendering resolves `productId` against the shared document so edits apply to all referring recipes on the next read. Live subscriptions are not part of stage 1.

## Compatibility and identity

Existing `imageUrl` / `imageUrls` fields remain the URL and order source during the transition. `images` carries their stable identities. Legacy URLs get deterministic IDs without a database migration; reading old documents does not write them. Saving materializes IDs and reference-only tags.

Reordering URLs preserves image IDs. Replacing a URL creates a different identity; tags for removed or replaced images are removed on save. Replacing an uploaded file produces a new URL and follows the same path. The same URL listed twice is treated as one photo, matching existing gallery behavior. Unchanged URLs retain their identity. Replacing bytes at an identical external URL cannot be detected by the app.

The existing editor upload and recipe save paths remain in use. `reconcileRecipeGallery` handles image identity and drops dangling image references, duplicate tag IDs and invalid coordinates. All callers should use the recipe service to persist changes.

## Shared product service

`taggedProductService.ts` provides read, catalog search, create/update and soft deletion. Search currently loads the catalog and filters product/brand names locally; remote full-text search can be considered if the catalog grows. Shared edits update one document; soft deletion leaves existing references intact and readers return no active product for a deleted ID.

Firestore rules permit public reads and verified-admin writes. No production rules or data have been deployed. The separate collection avoids coupling tagging information to the Shop catalog's selling, pricing and policy requirements. File upload UI and Storage integration for product thumbnails belong to the later administrator stage; stage 1 stores image URLs.

## Deferred

Stages 2–4 add tag rendering, popovers, related-product thumbnails, original-aspect-ratio gallery navigation, and administrator controls. Existing gallery UI is unchanged in stage 1. Emulator verification of the new Firestore rule and browser responsive/accessibility tests remain for later integration validation.

## Stage 2 implementation

`ShoppableImage` resolves product IDs with the shared product service, positions markers with percentage coordinates, and uses the existing Base UI Popover (including its hover safe-polygon behavior and collision-aware positioning). The popover positioner can receive a class override so it remains above the existing mobile lightbox.

Mouse hover, touch click, Enter/Space, Escape and outside dismissal are covered by component tests. Only one marker is open per image instance. Main-image load errors hide markers; missing/deleted products and invalid purchase URLs do not produce actionable markers. Product thumbnail errors use an icon placeholder. The original gallery thumbnail selectors and mobile lightbox remain; related products and new navigation controls are deferred to stage 3.

Original photo proportions are now used so stored coordinates correspond to the visible image. Percentage-position tests verify coordinate styles at different container widths, but do not replace real-browser layout and viewport-edge visual checks. Real mobile-device testing and screen-reader testing have not been performed.

Validation: TypeScript and production build passed. Targeted tests: 16 passed, 1 pre-existing failure in recipe cooking-group ordering (implementation sorts by name while the test expects original order). No sorting behavior was changed in stage 2. Firebase deployment and production data changes were not performed.

## Stage 3 implementation

The main gallery now uses previous/next buttons and an announced photo counter instead of recipe-photo thumbnails. Horizontal swipes work on the main image and the mobile lightbox; vertical gestures remain scrolling. A swipe suppresses the synthetic click that would otherwise open the lightbox. Tag, popup, product-link and navigation gestures do not start a swipe.

`RelatedImageProducts` shows unique, valid products tagged on the current photo, in tag order. Links open their purchase URLs in a new tab with `noopener noreferrer`. Missing/deleted products, invalid URLs and untagged photos do not produce a related-product section. Missing or failed product thumbnails have a placeholder. This stage adds no administrator UI and deploys no Firebase rules.

Validation: 21 targeted component/data tests passed, including pointer/keyboard tag interactions, photo-specific tags, swipe direction, boundary buttons, unique related products, secure links and product thumbnail failures. TypeScript and production build were checked. Actual browser visual/mobile-device validation remains unavailable because Computer Use access to Chrome was denied in the preceding verification step.

## Stage 4 administrator editing

The authenticated recipe edit page contains a `ProductTagEditor` immediately after the recipe-photo editor. It loads/searches the shared catalog, creates new products, edits and soft-deletes existing products, and lets administrators place or reposition tags by clicking the photo or editing percentage coordinates. A centered-add button and numeric controls provide a keyboard alternative. Product images may be entered as URLs or uploaded (JPG/PNG/WebP/AVIF, at most 10 MB) through the existing `products/{productId}/...` Storage path.

Shared product save/delete operations are immediate. The UI explains this separately from recipe tag changes, which remain drafts until the recipe Save button is used. Editing and deleting shared products requires a confirmation describing the impact on every referencing recipe. Existing pages display changes on the next product fetch; no realtime subscription has been added. Soft-deleted product references can remain in other recipe documents, but public readers omit them.

Image draft IDs now follow the photo through cover reordering and upload completion. Replacing a URL/file assigns a fresh identity and removes the replaced photo's draft tags; removing a photo also prunes its tags. File-based recipe images can be tagged before uploading. Saving uploads the image, persists its ID with the final URL, and reconciles tags to the saved gallery. Main-gallery photos only; plating images are unchanged.

Permissions still rely on the existing verified-admin Firebase rules, not on the UI visibility check. The stage-1 `taggedProducts` Firestore rule must be deployed before production product writes work. This stage does not deploy rules, write production test data or create additional Storage rules. Production account and Storage upload checks remain pending. The automated suite uses mocks; it does not establish production deployment readiness.

Validation: 29 tests across administrator editing, image identity, recipe save, related-product lists and detail-page interactions passed. Browser visual/mobile-device checks remain pending because prior Computer Use access to Chrome was denied.
