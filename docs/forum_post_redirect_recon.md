# Forum Post Redirect Bug — Recon

Recon-only diagnosis. No fix code in this commit. Fix lands in
the followup.

## Symptom (re-stated)

User creates a forum thread → submission persists in DB → redirect
fires to the thread URL → destination page renders a "something is
wrong" / "Thread not found" page even though the thread exists.

## Root cause

**Race between the redirect and the destination page's queries,
combined with a `NotFound` early return that doesn't distinguish
"still loading" from "truly missing".**

### The redirect path is correct

`src/components/forums/NewThreadDialog.jsx:38-59` — `createThread`
returns the inserted row (the supabase call uses `.select().maybeSingle()`),
slug is generated from the title and persisted on the row. On
success the dialog navigates to:

```js
navigate(`/forums/${category.slug}/${thread.slug}`);
```

The route exists at `src/App.jsx:116-120` and mounts
`Pages.ForumThread`. Both `category.slug` and `thread.slug` are
defined on the props that reach this point (the `category` prop
came from `ForumCategory.jsx:252` which got it from
`getCategoryBySlug`; `thread.slug` comes back from the insert's
`.select()`).

So the URL is well-formed and the route resolves. The problem is
what `ForumThread` does on first render.

### The destination page returns NotFound during loading

`src/pages/ForumThread.jsx:24-97`:

```jsx
const { data: category } = useQuery({
  queryKey: ["forumCategory", categorySlug],
  queryFn: () => getCategoryBySlug(categorySlug),
});

const { data: thread } = useQuery({
  queryKey: ["forumThread", category?.id, threadSlug],
  queryFn: () => getThread(category.id, threadSlug),
  enabled: !!category?.id && !!threadSlug,
});

// …

if (!category) {
  return <NotFound />;
}
if (category && !thread) {
  return <NotFound />;
}
```

Both `useQuery` calls only destructure `data`. While a query is
fetching, `data` is `undefined`. The early-return checks
`!category` and `!thread` treat:

- Loading (`data === undefined`)
- Truly missing (`data === null` returned by `getCategoryBySlug` /
  `getThread`)

…as the same case. So the FIRST render after the redirect lands
(before the queryFn has even fired its network request) renders
`<NotFound />`. That's the "Thread not found" page Boky sees.

The page WOULD eventually transition to the real thread once the
queries resolve — but React Router's Layout chrome plus the cream
background makes this look like a stable error state, not a
loading flicker. Manual refresh from the same URL works for the
same reason: the queries have time to populate the cache before
the page renders.

### Why the data persists

The data is FINE. `forum_threads` row was inserted, slug is
correct, RLS allows reads (`anyone_read_forum_threads` policy at
`migrations/20261111_forums.sql:74`), the unique-per-category
index doesn't conflict for fresh slugs. The bug is strictly in
the destination page's loading-state handling.

## Affected files

- `src/pages/ForumThread.jsx:92-97` — the early-return logic that
  needs to gate on "queries actually resolved" rather than
  "data is falsy".

That's the only file the fix touches. Optional secondary improvement:

- `src/components/forums/NewThreadDialog.jsx:51-57` — could
  pre-populate the thread query cache with the freshly-inserted
  row via `queryClient.setQueryData(["forumThread", category.id,
  thread.slug], thread)` before navigating. This eliminates the
  network roundtrip on the destination page entirely. Same fix
  for `["forumCategory", category.slug]` if the category isn't
  already cached.

## Recommended fix

Two layers; both small.

**Primary (required):** in `ForumThread.jsx`, pull `isLoading`
(or `isPending`) from each `useQuery`. Render a loading state
when EITHER query is still resolving. Only render `<NotFound />`
when both queries have settled AND the row is genuinely missing
(`data === null`):

```jsx
const { data: category, isLoading: categoryLoading } = useQuery(...);
const { data: thread, isLoading: threadLoading, isFetched: threadFetched } = useQuery(...);

if (categoryLoading) return <LoadingState />;
if (!category) return <NotFound />;            // category truly missing
if (threadLoading || !threadFetched) return <LoadingState />;
if (!thread) return <NotFound />;              // thread truly missing
```

**Secondary (nice-to-have):** in `NewThreadDialog.jsx`'s
`onSuccess`, prime the query cache with the fresh thread before
navigating so the destination page renders the new thread on
first paint without a roundtrip:

```js
onSuccess: (thread) => {
  // …existing toasts + invalidations…
  queryClient.setQueryData(
    ["forumThread", category.id, thread.slug],
    thread,
  );
  queryClient.setQueryData(
    ["forumCategory", category.slug],
    category,
  );
  navigate(`/forums/${category.slug}/${thread.slug}`);
}
```

## Risk assessment

- **Pure render-path fix.** Doesn't touch the insert, doesn't
  touch RLS, doesn't touch the slug logic.
- **No data shape changes.** `getThread` and `getCategoryBySlug`
  keep returning the same null-on-miss contract.
- **Single file (primary fix).** Optional cache prime touches a
  second file but is additive — removing it just means a
  100-200ms loading state on first navigation.
- **Same loading-state pattern fixes any other pages with the
  same anti-pattern.** Worth a follow-up smell scan.

## Smells filed

1. **`!data` is treated as 404 in multiple places** — the same
   anti-pattern in `ForumThread.jsx:92-97` likely repeats in
   other route-level pages that destructure `useQuery` data
   without `isLoading`. A grep for `if (!{loaded-data}) return
   <NotFound`-style branches would surface them.
2. **`useQuery({queryKey: [...], queryFn: ...})` without an
   error state.** Both queries swallow Supabase errors via
   `data || null` in the queryFn — if the query failed for a
   real reason (RLS, network, schema), the page renders
   `<NotFound />` which looks identical to a true miss. A
   followup could surface `error` to the user on actually-failed
   queries.
3. **Optimistic cache priming pattern is missing project-wide.**
   The redirect-then-fetch dance happens in many flows
   (post-create → /forum/thread, character-create → /character,
   campaign-create → /campaign). Each suffers the same
   first-paint loading flicker. A shared "create-and-prime"
   helper would generalize the secondary fix from this commit.
