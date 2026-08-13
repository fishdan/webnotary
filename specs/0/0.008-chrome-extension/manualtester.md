# Manual Tester: Chrome Extension

**Status**: Stub

1. Visit site with cached VALID pair → no network call to WebNotary.
2. Clear cache; confirm single `/v1/check` and correct UI for each status.
3. Expire cache entry; confirm revalidation.
4. Confirm no request storm on multi-resource page loads.
