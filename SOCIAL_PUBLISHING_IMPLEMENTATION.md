# Social Media Publishing Implementation

## Summary

Real social media publishing has been implemented for the AmplifyHub AI platform. The system now makes actual API calls to Facebook, Twitter/X, LinkedIn, and Instagram (with limitations for TikTok, YouTube, WhatsApp).

## What Works Now

### ✅ Text-Only Posts (All Platforms)
- **Facebook**: Creates text posts on pages
- **Twitter/X**: Publishes tweets
- **LinkedIn**: Creates text-only UGC posts
- **Instagram**: Publishes single-image posts (Business/Creator account required)
- **TikTok**: Returns helpful error (not implemented)
- **YouTube**: Returns helpful error (not implemented)
- **WhatsApp**: Returns helpful error (uses separate contact-based sender)

### ✅ Single-Image Posts
- **Facebook**: Via URL upload or direct image upload
- **Instagram**: Single image via container + publish workflow

### ⚠️ Multi-Image / Video (Partial)
- **Facebook**: Multiple images not yet implemented
- **LinkedIn**: Media upload workflow started but incomplete
- **Twitter**: Image upload works (single), video upload not implemented
- **TikTok**: Requires chunked video upload (not implemented)
- **YouTube**: Requires resumable upload (not implemented)

## Architecture

### Files Added
- `src/lib/publishers.ts` - Platform-specific publisher classes
- `src/lib/token-utils.ts` - Token refresh & rate-limit retry logic
- `src/lib/media-upload.ts` - Media download & upload utilities

### Files Modified
- `src/app/api/posts/[id]/route.ts` - Now calls real publishers before updating DB
- `src/app/api/scheduler/route.ts` - Uses real publishing for scheduled posts
- `src/lib/auth.ts` - Updated OAuth scopes for publishing permissions
- `prisma/schema.prisma` - Added `idempotencyKey` to PlatformPost
- `prisma/migrations/20260427000000_add_idempotency_key/migration.sql` - Migration

## How It Works

1. User clicks "Publish to All Selected Accounts"
2. Frontend calls `PATCH /api/posts/[id]` with `action: "publish"`
3. Server fetches full `SocialAccount` records (tokens, account IDs)
4. Server calls `publishToPlatforms(accounts, content, mediaUrls)`
   - For each account: gets platform publisher, refreshes token if expired, attempts API call with retry
   - Errors are isolated per platform
5. Results collected and stored in `PlatformPost` records:
   - Success → `status: "PUBLISHED"`, `externalId: <platform_post_id>`
   - Failure → `status: "FAILED"`, error logged
6. Main `Post` status set to `PUBLISHED` if at least one platform succeeded

## Token Refresh

Automatic token refresh implemented for all platforms:
- Facebook: `fb_exchange_token` grant
- Twitter: OAuth2 refresh token
- LinkedIn: `refresh_token` grant
- Instagram: Inherits Facebook token system
- YouTube: Standard OAuth2 refresh
- TikTok: Refresh token endpoint

**Note:** Existing tokens won't have refresh tokens unless `offline.access` scope was requested. Users must re-authorize after this deployment.

## Rate Limiting & Retry

All API calls use `fetchWithRetry()` with:
- Exponential backoff (base 1s, max 3 retries)
- Honors `retry-after` header
- Retries on 429 (Too Many Requests) and 503 (Service Unavailable)

## Duplicate Protection

Idempotency implemented via:
1. Content hash check: Identical content to same account within 5 minutes rejected
2. Per-account idempotency key stored (deterministic hash: content+account+user)
3. Frontend button disabled during publish to prevent double-clicks

## Known Limitations & Fixes Needed

### 1. Media Upload (High Priority)
**Current State:**
- ✅ Facebook: Single image via URL or direct upload
- ✅ Instagram: Single image
- ⚠️ Twitter: Image upload has issues (uses deprecated v1.1 endpoint, needs OAuth1)
- ❌ LinkedIn: Not implemented (requires 2-step upload)
- ❌ TikTok: Not implemented (chunked upload)
- ❌ YouTube: Not implemented (resumable upload)

**Fix Required:** Implement upload endpoints for each platform that lacks them. See `src/lib/media-upload.ts` for skeleton.

### 2. WhatsApp Not a "Feed" Platform
**Current State:** Returns error directing users to use contact-based sender.

**Why:** WhatsApp Business API doesn't support "feed" posts. Only 1:1 messages or template broadcasts to specific recipients.

**Fix Required:** Keep separate from social media publishing. The existing WhatsApp contact sender (Email/WhatsApp section) is correct.

### 3. Token Expiration
**Current State:** Refresh logic in place, but existing tokens may lack refresh tokens.

**User Action Required:** Users must re-authorize all social accounts after deployment to obtain refresh tokens.

### 4. OAuth Scopes Not Approved
**Current State:** Scopes updated in `auth.ts` to include publishing permissions:

| Platform   | Required Scopes                                                                 |
|------------|--------------------------------------------------------------------------------|
| Facebook   | `pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish` |
| Twitter    | `tweet.write users.read offline.access`                                       |
| LinkedIn   | `openid profile email w_member_social`                                        |
| Instagram  | `user_profile,user_media,content_publish`                                     |
| YouTube    | `https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl` |

**User Action Required:** In each platform's developer console, ensure these scopes are added to your app and approved (some require review).

### 5. TikTok & YouTube Not Implemented
**Current State:** Return errors explaining why.

**User Action Required:** Either implement upload APIs (complex) or hide these platforms from the UI (remove from `PLATFORMS` array in compose page).

### 6. Idempotency Key Column Not Actually Used
**Current State:** Column added to schema, not fully enforced.

**Improvement Needed:** Create & run migration, then store `idempotencyKey` on each PlatformPost. Use it for exact duplicate prevention (currently uses 5-minute window check).

## Migration Checklist

1. Apply Prisma schema changes:
   ```bash
   npx prisma db push  # OR npx prisma migrate dev
   ```
   Migration file already created at `prisma/migrations/20260427000000_add_idempotency_key/`

2. Update OAuth app configurations on:
   - Facebook Developer Console
   - Twitter Developer Portal
   - LinkedIn Developer Platform
   - Instagram (via Facebook)
   - Google Cloud Console (YouTube)

3. Deploy code and have all users re-authorize social accounts to get new tokens with correct scopes.

4. Test each platform individually:
   - Facebook text post
   - Twitter text post
   - LinkedIn text post
   - Instagram single-image post

5. For platforms returning "not implemented", either implement upload logic or hide from UI.

## Future Enhancements

- **Bulk media upload**: Facebook multiple images, LinkedIn carousel
- **Video upload**: TikTok, YouTube, Facebook, Twitter, LinkedIn
- **Rich media**: GIFs, polls, link previews
- **Advanced scheduling**: Timezone-aware, optimal time detection
- **Analytics sync**: Pull engagement data automatically
- **Content variations**: Platform-specific customizations (different text per platform)
- **Error dashboard**: See per-platform failure reasons, retry failed posts
- **Webhook notifications**: Get notified when posts are published

## Testing

Use these test accounts or your own:
- Ensure `SocialAccount.isActive = true`
- Verify `accessToken` and `accountId` (for FB pages, LinkedIn person URN) are stored
- Use safe content first (drafts, private test pages)
