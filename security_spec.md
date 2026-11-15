# Security Specification: 2D Virtual Art Museum

## 1. Data Invariants
1. **Identity Integrity**: Artwork uploads, updates, and deletions require an authenticated, email-verified user (`request.auth != null && request.auth.token.email_verified == true`) with `authorUid == request.auth.uid`. Visitor reviews (`comments` and `curated_reviews`) may be created by unauthenticated guests using `authorUid == 'guest'` or by verified signed-in users using `authorUid == request.auth.uid`, while updates and deletions remain strictly restricted to verified owners.
2. **Document Size & Payload Bounds**: Uploaded artwork `imageDataUrl` strings are bounded (`minLength: 20`, `maxLength: 920000`) and `compressedSizeBytes` is bounded (`> 0 && <= 1048576`) so every Firestore document remains strictly under Firestore's 1MB document limit.
3. **Referential Integrity**: Subcollection comments under `/artworks/{artworkId}/comments/{commentId}` cannot exist unless the parent artwork exists and has `status == 'published'`, verified via `get()`. Reviews in `/curated_reviews/{reviewId}` must reference one of the four valid permanent curated artwork IDs.
4. **Strict Key Allowlisting & No Shadow Fields**: Every document creation enforces both `keys().hasAll(...)` and `keys().hasOnly(...)`. Every update uses `affectedKeys().hasOnly(...)` inside an action branch wrapped by `isValid[Entity](incoming())`.
5. **Temporal Integrity & Immortality**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` and `authorUid` are immutable after creation; `updatedAt` must equal `request.time` on update.
6. **Public Gallery Query Enforcement**: `allow get` and `allow list` on `/artworks` require `resource.data.status == 'published'`; `allow get` and `allow list` on comments/reviews require `resource.data.status == 'visible'`. No PII (emails, phone numbers, addresses) is stored in public documents.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Artwork Upload**: `create` on `/artworks/art1` with `request.auth == null`.
2. **Unverified Email Upload**: `create` on `/artworks/art1` with `email_verified: false`.
3. **Identity Spoofing on Artwork**: `create` on `/artworks/art1` by `uid: "userA"` with `authorUid: "userB"`.
4. **Shadow Field Injection on Artwork**: `create` on `/artworks/art1` including extra ghost field `isFeatured: true`.
5. **Oversized Image Payload (>1MB)**: `create` on `/artworks/art1` with `compressedSizeBytes: 1500000` or `imageDataUrl` > 920,000 chars.
6. **Client-Spoofed Timestamp**: `create` on `/artworks/art1` with `createdAt` set to a past client timestamp instead of `request.time`.
7. **Unauthorized Artwork Update by Non-Owner**: `update` on `/artworks/art1` (owned by `userA`) attempted by `userB`.
8. **Mutating Immortal `authorUid` or `createdAt`**: `update` on `/artworks/art1` by owner attempting to change `authorUid` or `createdAt`.
9. **Unauthorized Artwork Deletion by Non-Owner**: `delete` on `/artworks/art1` (owned by `userA`) attempted by `userB`.
10. **Orphaned Comment Creation**: `create` on `/artworks/nonexistent/comments/c1` where parent artwork does not exist.
11. **Invalid Curated Exhibition ID**: `create` on `/curated_reviews/r1` with `curatedId: "curated-fake"`.
12. **Blanket / Unfiltered Status Scraping**: `list` on `/artworks` without filtering `status == 'published'` (or trying to read a document with `status != 'published'`).
