# GitGud — Workflow Documentation

This document walks through **every workflow** in the GitGud application, end to end — from the moment a user lands on the auth screen, through repository creation, editing notes, forking, and submitting/merging a merge request. Each workflow has its own section with the UI flow, the API calls made, and the backend logic that runs for each step.

> **Conventions**
> - All API routes live in the NestJS backend (`backend/src`). Repository/notes/sections/profiles are handled by `RepoController`/`RepoService`; merge requests by `MergeRequestController`/`MergeRequestService`; auth by `AuthController`/`AuthService`.
> - Every route that mutates or reads user data (except `signup`, `login`, `logout`) is behind `JwtAuthGuard`, which verifies the `gitgud_token` httpOnly cookie.
> - All JSON "note content" is a TipTap-style JSON document, e.g. `{ type: "doc", content: [{ type: "paragraph", ... }] }`.

---

## 1. Route protection & session handshake

This is the pre-workflow that gates every other workflow. It happens on **every** request.

1. The Next.js **middleware** (`frontend/src/middleware.ts`) runs on all routes except `/api`, static assets, `favicon.ico`, and `icon.svg`.
2. It reads the `gitgud_token` cookie:
   - Visiting `/auth*` **with** a token → redirect to `/`.
   - Visiting `/auth*` **without** a token → allowed (show login).
   - Visiting any other route **without** a token → redirect to `/auth` (login screen).
   - Visiting any other route **with** a token → allowed.
3. Once inside the `(app)` shell, `AuthProvider` (`app/context/AuthContext.tsx`) calls **`GET /auth/me`** on mount to hydrate the current user (`{ userId, email, username, avatarUrl }`) and expose `{ user, loading, refreshUser }`.
4. If any API call later returns **401**, `apiFetch` (`lib/http.ts`) performs a hard redirect to `/auth`.

> Note: middleware is *presence-based* — it doesn't cryptographically validate the token. Validation happens on every authenticated API call in the backend.

---

## 2. Registration (signup)

**UI:** `/auth` → "Sign up" tab (`app/auth/page.tsx`).

1. User enters **email**, **username** (3–20 chars, letters/numbers/underscores), and **password** (min 8 chars).
2. Form posts to **`POST /auth/signup`** (`AuthController`) with `{ email, username, password }`.
3. `AuthService.signup` (`auth.service.ts`):
   - Queries for an existing user by **email OR username**.
   - If either exists → **409 Conflict** `"An account with this email/username already exists"` (reported field is whichever matched).
   - Hashes the password with **bcrypt (10 salt rounds)**.
   - Creates the `User` row.
   - Calls `issueToken(user)` (`jwt.utils.ts`) → signs a JWT (`sub`, `email`, `username`, `expiresIn: '7d'`) with `process.env.JWT_SECRET`.
4. Controller sets the JWT as an **httpOnly cookie** `gitgud_token` (`maxAge` 7 days, `sameSite: lax`) and returns `{ user }`.
5. Frontend stores the user in `localStorage.user`, then `router.push("/")`, which redirects to `/dashboard`.

**Validation** (`dto/auth.dto.ts`): `@IsEmail` on email, username regex `^[a-zA-Z0-9_]{3,20}$`, `@MinLength(8)` on password.

---

## 3. Login

**UI:** `/auth` → "Log in" tab.

1. User enters an **identifier** (either email *or* username) and **password**.
2. Form posts to **`POST /auth/login`** (`AuthController`, `@HttpCode(200)`).
3. `AuthService.login`:
   - Finds the user by **`OR: [{ email: identifier }, { username: identifier }]`**.
   - If no user OR password mismatch (`bcrypt.compare`) → **401 Unauthorized** `"Invalid credentials"` (same message for both, to avoid user enumeration).
   - Otherwise signs the JWT and returns it.
4. Controller sets the `gitgud_token` cookie, returns `{ user }`.
5. Frontend stores user, redirects to `/dashboard`.

---

## 4. Logout & session

**UI:** Navbar logout button → confirmation modal → Confirm.

1. Frontend calls **`POST /auth/logout`** with credentials.
2. Controller clears the `gitgud_token` cookie (`res.clearCookie`, path `/`), returns `{ success: true }`.
3. Frontend removes `localStorage.user`, then `window.location` reloads `/auth`.

**Implicit logout:** if the JWT expires (7 days) or is invalid, the next API call returns 401 → `apiFetch` hard-redirects to `/auth`.

---

## 5. Change password

**UI:** `/settings` → "Change Password" section.

1. User enters current password and a new password (min 8 chars) plus confirmation; frontend validates the two match.
2. **`POST /auth/change-password`** (guarded) with `{ currentPassword, newPassword }`.
3. `AuthService.changePassword`:
   - Loads the user by JWT `sub`; 401 if missing.
   - `bcrypt.compare(currentPassword, user.password)` — 401 `"Current password is incorrect"` on mismatch.
   - Hashes and stores the new password, returns `{ success: true }`.

---

## 6. Viewing your dashboard

**UI:** `/dashboard` (authenticated home).

1. Two independent `RepoSection` components fetch previews in parallel:
   - **`GET /repositories?scope=owned&limit=4`**
   - **`GET /repositories?scope=forked&limit=4`**
2. A search box filters both sections with a 300 ms debounce (adds `&search=<term>`).
3. Cards link to `/repos/[id]`; "New repository" links to `/dashboard/new-repo`; "View all" links to `/my-repositories` / `/my-forks`.
4. `RepoService.findRepositories` builds a `where` from the scope:
   - `owned` → `ownerId = user` AND `forkedFromId = null`
   - `forked` → `ownerId = user` AND `forkedFromId != null`
   - `discover` → `isPublic = true`
   - `starred` → `stars.some(userId)`
   - optional `search` adds a case-insensitive `name`/`description` `contains`.
5. Returns `{ items, total, page, limit, hasMore }` with pagination (`skip/take`, default `limit 20`).

---

## 7. Creating a repository

**UI:** `/dashboard/new-repo` → "New repository" (`new-repo/page.tsx`).

1. User fills in **name** (required), optional **description**, and toggles **public/private**.
2. Optionally builds a **section tree** with `SectionTreeBuilder` (add top-level section, add nested section, delete, reorder, expand/collapse).
3. Submit calls **`POST /repositories`** with `{ name, description, isPublic, sections: [...] }` via `toSectionInput()`.
4. `RepoService.createRepository` wraps `createRepositoryInTx` in a **transaction** (`$transaction`):
   - Checks `@@unique([ownerId, name])` — **409 Conflict** `"You already have a repository with this name"` (also caught from the P2002 error path).
   - Creates the `Repository` row.
   - Recursively creates the section tree; for any section with a `note`, creates a `Note` row with the given JSON content (and `originNoteId` if present, used on forks).
   - Returns `{ repo, createdNotes }`.
5. Success → `router.push("/repos/[id]/edit")`.

**Note/version behavior:** creating a repo with notes does **not** create `Version` records (forking does; see §11).

---

## 8. Repository listing & browsing

Shared `RepoBrowser` component drives three pages, all calling `GET /repositories` with a scope:

| Page | Route | Scope |
|------|-------|-------|
| Discover | `/discover` | `discover` (`isPublic = true`, any owner) |
| My Repositories | `/my-repositories` | `owned` |
| My Forks | `/my-forks` | `forked` |
| Starred | `/starred` | `starred` |

Behaviors: search (debounced 300 ms, resets to page 1), Previous/Next pagination (`page`, `limit: 12`), empty states, and `RepoCard` links (showing owner, visibility badge, star/fork/section counts, relative updated time, fork origin).

---

## 9. Viewing a repository (read-only)

**UI:** `/repos/[id]` (`repos/[id]/page.tsx`).

1. `fetchRepository(id)` → **`GET /repositories/:id`**, guarded.
2. `RepoService.findRepository`:
   - Includes owner, `forkedFrom` (name + original owner), full section tree (`sections.include.note`, ordered), and counts.
   - **Access rule:** 404 if not found; **403 Forbidden** if the repo is private and not owned by the caller.
   - Returns the payload plus `editable: repo.ownerId === userId`.
3. Frontend auto-navigates: **owners** are `router.replace`'d to `/repos/[id]/edit`. Non-owners (or anonymous reads of public repos) stay on this read-only page.
4. On this page the visitor can:
   - Select sections in the tree (`buildTree`/`flattenTree` utilities) to view the note, rendered read-only with `NoteEditor` (`editable={false}`).
   - Click **Star** → `POST /repositories/:id/star` or `DELETE /repositories/:id/star` (see §16).
   - Click **Fork** → `POST /repositories/:id/fork` (see §11), showing a success banner linking to `/repos/[forkedId]/edit`.
   - Open **History** → `GET /repositories/:id/notes/:noteId/versions` and preview any past version read-only.
   - View **open merge requests** for the repo (`GET /merge-requests?repoId=:id`).
   - Link to the owner's profile `/profile/[userId]`.

The add/delete/create-note callbacks passed to `SectionTree` are deliberately no-ops on this read-only page.

---

## 10. Editing a repository

**UI:** `/repos/[id]/edit` (`repos/[id]/edit/page.tsx`).

1. Guard: if the current user is **not** the owner, `router.replace('/repos/[id]')` sends them back to the read-only view.
2. Loads the repo via `fetchRepository(id)`.

### 10a. Manage the section tree
- Expand/collapse nodes; select one.
- **Add section** → `POST /repositories/:id/sections` with `{ title, parentId?, order? }`.
  - `RepoService.addSection` asserts ownership, then validates:
    - If `parentId` given: parent must exist in this repo (404), and a parent **with a note** cannot gain children (**409** — a section with a note can't have sub-sections).
    - `order` defaults to the count of siblings at that level.
- **Delete section** → `DELETE /repositories/:id/sections/:sectionId` (ownership-checked, cascade deletes children, note, and versions via the schema `onDelete: Cascade`).
- **Update section** (title/order/parent via `updateSection`) enforces: can't be its own parent (400), target parent must exist and be noteless (404/409), and **no cycles** (`wouldCreateCycle` walks up the parent chain → 400 `"A section cannot be moved inside its own sub-section"`).

### 10b. Create & edit notes (rich text)
- **Create note** on a selected section → `POST /repositories/:id/sections/:sectionId/note`.
  - `RepoService.createNote` ownership-checks, then rejects with **409** if the section already has a note or has child sections. Creates a note with an empty document `{ type: "doc", content: [{ type: "paragraph" }] }`.
- **Edit** the note in the TipTap `NoteEditor` — headings, bold/italic/underline, lists, blockquotes, code blocks, images, links, undo/redo. Changes populate local `workingContent` only.
- **Save Version** (or Cmd/Ctrl+S) → `PATCH /repositories/:id/notes/:noteId` with `{ content, changeSummary? }`.
  - `RepoService.saveNote` asserts ownership; finds the note scoped to this repo (404 otherwise); runs a **transaction** that (1) updates `Note.content` and (2) inserts a new `Version` row (`editedBy = userId`, content, optional `changeSummary`). Every save = a new version.

### 10c. Version history & restore
- Open History → `GET /repositories/:id/notes/:noteId/versions` returns versions newest-first.
- **Restore**: clicking a version copies its `content` (and summary) back into the editor's `workingContent`; the user then saves to persist (creating another version).

### 10d. Preview
- Toggle between the editor and a read-only rendered preview (`NoteEditor editable={false}`) — no API calls.

---

## 11. Forking a repository

**UI:** "Fork" button on `/repos/[id]` (also reachable from edit page headers).

1. Frontend calls **`POST /repositories/:id/fork`**.
2. `RepoService.forkRepository`:
   - Loads original repo + full section tree (`sections.include.note`).
   - **404** if not found; **403** `"Only public repositories can be forked"`; **400** `"You cannot fork your own repository"`.
   - Calls `resolveForkName` to avoid `(ownerId, name)` collisions: keeps the base name if free, else `"<name> (fork)"`, `"<name> (fork 2)"`, ….
   - `buildSectionTree` flattens the original's sections into the input shape, carrying each note's `originNoteId` (the *original* note id).
   - Runs one **transaction**:
     - `createRepositoryInTx` copies the repo + full section tree + notes.
     - For **each copied note**, inserts a `Version` with `changeSummary: 'Forked from "<original name>"'` and `editedBy = forker` — so every fork snapshot has history.
     - Inserts a `Fork` row `{ originalRepoId, forkedRepoId, forkedBy }` (lineage used by profile stats and the `forkedCopies`/`forkOrigin` relations).
   - Returns the new repo; frontend banner links to `/repos/[forkedId]/edit`.
3. The fork maintains `Repository.forkedFromId → original`, and `Note.originNoteId → original note` — the key to the merge-request targeting (§13).

---

## 12. Starring / unstarring

**UI:** Star toggle button on `/repos/[id]` (and any page rendering repo detail).

1. On load, the page calls **`GET /repositories/:id/starred`** → `{ starred }` to render the correct state.
2. Toggle:
   - **Star** → `POST /repositories/:id/star` → `RepoService.starRepository`: 404 if repo missing; **400** `"You cannot star your own repository"`; **409** `"Already starred this repository"` if the `@@unique([userId, repoId])` star exists; else inserts the `Star` row → `{ starred: true }`.
   - **Unstar** → `DELETE /repositories/:id/star` → `RepoService.unstarRepository`: 404 if no star row; deletes it → `{ starred: false }`.
3. Star counts are recomputed from the response (`repo.stars`) and shown on `RepoCard`, `findRepositories` results, and profile stats.

---

## 13. Creating a merge request (fork → owner)

**Precondition:** you are the owner of a **fork**, and you've edited at least one note in it.

**UI:** `/repos/[id]/edit` → "Submit Merge Request" modal (`repos/[id]/edit/page.tsx`).

1. User attaches an optional **title** and **description**, then submits. The request sends **`POST /merge-requests`** with `{ repoId, noteId, title, description?, content }` where `content` is the edited note's TipTap JSON and `repoId`/`noteId` belong to the fork.
2. `MergeRequestService.createMergeRequest`:
   - Loads the repo; 404 if missing; **403** if it's a private repo not owned by the submitter.
   - Finds the note (scoped to the repo); 404 otherwise.
   - **Target resolution:** if `repo.ownerId === userId` (submitting from your *own* fork):
     - Requires `repo.forkedFrom` to exist → **400** `"You cannot create a merge request on your own repository"` if the repo isn't a fork of someone else's.
     - Resolves `note.originNoteId` → the **original note in the parent repo**; 404 if the origin note is gone (`SetNull` on origin delete). The MR therefore targets *that* note in *that* repo.
     - Otherwise (no fork lineage), the MR targets the repo/note directly — used for contributing to a repo you don't own that somehow granted access.
   - **Dedup:** checks for an existing `pending` MR with same `repoId + noteId + submittedBy` → **409** `"You already have a pending merge request for this note"`.
   - Creates the `MergeRequest` row: `repoId` (target), `noteId` (target note), `submittedBy`, `title`, `description`, `oldContent` (snapshot of the *target* note's content at creation time), `newContent` (the proposed content), status `pending`.
   - Returns `{ id, repo: { id, name } }`; UI links to the canonical MR detail `/merge-requests/[id]`.

---

## 14. Merge request list / dashboard

**UI:** 
- `/merges` — user-wide dashboard with **Received** and **Submitted** tabs.
- `/repos/[id]/merge-requests` — repo-scoped list with All/Pending/Approved/Rejected filters.

Both call **`GET /merge-requests`** with filters:
- `scope=received` → `repo.ownerId === user`; `scope=submitted` → `submittedBy === user`.
- `repoId=:id` → restricts to one repo (404/403 access check on the repo).
- `status=pending|approved|rejected|cancelled` → filters by MR status.

`listMergeRequests` returns MRs (newest first) including submitter, repo, note section, and full comment thread. Cards link to `/merge-requests/[id]`.

> The legacy route `/repos/[id]/merge-requests/[mid]` simply `router.replace`s to the canonical `/merge-requests/[mid]`.

---

## 15. Merge request detail, review & commenting

**UI:** `/merge-requests/[mid]` (`merge-requests/[mid]/page.tsx`).

1. Load: **`GET /merge-requests/:id`**:
   - `MergeRequestService.findMergeRequest` loads the MR + association; 404 if missing; `assertCanAccess` → the repo owner, the submitter, or anyone (if the target repo is public) may view; else **403**.
   - Returns the MR with `oldContent`/`newContent` replaced by **`diff: computeFlatDiff(oldContent, newContent)`**.
   - `computeFlatDiff` (`diff.util.ts`): converts both TipTap docs to plain text (`docToPlainText`), runs **diff-match-patch** with semantic cleanup, emits ordered rows `{ type: 'equal' | 'insert' | 'delete', text }`. `DiffView` renders these side-by-side.
2. **Approve** (owner only): `PATCH /merge-requests/:id` with `{ status: "approved", feedback? }`.
   - `updateMergeRequest` checks ownership (403 `"Only the repository owner can update this merge request"`) and that the MR is still `pending` (400 if resolved).
   - Runs a **transaction**:
     - If `approved`: writes `newContent` into the **target note** (`note.update`) and creates a **Version** on that note with `editedBy = mr.submittedBy` and `changeSummary: 'Approved merge request: <title>'` — the submitter is credited as the version's editor.
     - Then sets MR `status` (and `feedback` if provided). The MR row itself is *not* deleted — it stays as an approved record.
3. **Reject** (owner only): same endpoint with `{ status: "rejected", feedback }`. The rejection prompt collects optional text feedback, shown on the MR afterward. No content is written to the target note.
4. **Cancel** (submitter only): `PATCH /merge-requests/:id/cancel` → `cancelMergeRequest` (403 if not the submitter; 400 if not pending) sets status `cancelled`. The MR remains as a record.
5. **Comment**: `POST /merge-requests/:id/comments` with `{ content }` → `addComment` (access-checked) inserts a `Comment` row linked to the MR. The thread re-renders (orderBy `createdAt asc`).
6. After any status mutation the page refetches the MR.

**Status lifecycle:** `pending` → `approved` | `rejected` | `cancelled` (terminal). Only `pending` MRs can be approved/rejected/cancelled.

---

## 16. Profile view

**UI:** `/profile/[userId]` (e.g., from any owner link).

1. **`GET /profiles/:userId`** → `RepoService.getUserProfile`:
   - Loads the user's public profile fields (`username`, `name`, `bio`, `avatarUrl`, `createdAt`); 404 if missing.
   - `isSelf = viewerId === userId`.
   - Counts (visibility-aware: if viewing someone else, only public repos/stars count):
     - `repositories` (non-fork), `forksMade` (`Fork.forkedBy`), `starsReceived` (stars on the user's repos), `mergeRequestsReceived` (MRs targeting the user's repos), `mergeRequestsSubmitted` (MRs by the user).
   - Lists up to 50 non-fork repos (public unless self) with `CARD_SELECT` shape.
2. Renders cards linking to `/repos/[id]`; shows a "you" badge when `isSelf`.

---

## 17. Settings / profile editing

**UI:** `/settings` (`settings/page.tsx`).

### 17a. Update profile
1. Loads `fetchProfile` (self).
2. Editable: username, display name, bio (email is read-only).
3. **`PATCH /profiles/:userId`** with `{ username?, name?, bio? }`:
   - `RepoService.updateUserProfile`: **403** if `viewerId !== userId`; 404 if user missing; if changing username, **409** `"An account with this username already exists"` on clash.
   - Updates only provided fields, returns the profile. Frontend refreshes `AuthContext` (`refreshUser`).

### 17b. Avatar upload / removal
1. **Upload** → `POST /profiles/:userId/avatar` (multipart `file`, `FileInterceptor`).
   - `ProfilesController` uses disk storage with random UUID filenames + allowed image extensions (jpeg/png/webp/gif/avif), a mimetype `image/*` filter, and a **5 MB** limit.
   - `RepoService.uploadUserAvatar`: 403 if not self (file deleted); 404 if user missing; stores `avatarUrl = "/uploads/avatars/<uuid>.<ext>"`, deletes the previous avatar file best-effort, and exposes the files via `app.use('/uploads', express.static(...))` in `main.ts`.
2. **Remove** → `DELETE /profiles/:userId/avatar`: deletes the stored avatar file and nulls `avatarUrl`.
3. Both calls refresh `AuthContext` so the navbar/side panel update.

### 17c. Change password
See §5. (Note: the "Delete account" button is rendered but has no handler/API in the current build.)

---

## 18. State transitions summary (by entity)

**MergeRequest:**
```
             ┌──────────────┐
 submitted → │    pending   │── approve ──▶ approved
             │              │── reject  ──▶ rejected (feedback recorded)
             │              │── cancel  ──▶ cancelled   (submitter only)
             └──────────────┘
```
- Only the **target repo owner** can approve/reject; only the **submitter** can cancel; only `pending` can transition.
- Approve = write `newContent` to the target note + create a `Version` credited to the submitter.

**Repository:**
- `create` (owner, or via fork), `update`, `delete` — all ownership-checked (`assertOwnership`, 404/403).
- Forking creates a new repo with `forkedFromId` set; both the `fork` row and per-note `Version` snapshots are written.

**Section:**
- Nested tree; a section with a note cannot have children; no cycles allowed; `order` within siblings.

**Note:**
- One per section; every save appends a `Version`; `originNoteId` ties fork notes to their source for MR targeting; the last 10 versions are exposed on the note payload, all versions via the versions endpoint.

---

## 19. API route reference

| Method | Route | Guard | Purpose |
|--------|-------|-------|---------|
| POST | `/auth/signup` | — | Register |
| POST | `/auth/login` | — | Login (email OR username) |
| POST | `/auth/logout` | — | Clear session cookie |
| GET | `/auth/me` | JWT | Current user |
| POST | `/auth/change-password` | JWT | Change password |
| POST | `/repositories` | JWT | Create repo (+ optional section tree w/ notes) |
| GET | `/repositories` | JWT | List by `scope`/`search`/`page`/`limit` |
| GET | `/repositories/:id` | JWT | Repo detail (tree + notes + counts + `editable`) |
| PATCH | `/repositories/:id` | JWT | Update name/description/visibility (owner) |
| DELETE | `/repositories/:id` | JWT | Delete repo (owner) |
| POST | `/repositories/:id/fork` | JWT | Fork a public repo |
| POST | `/repositories/:id/star` | JWT | Star |
| DELETE | `/repositories/:id/star` | JWT | Unstar |
| GET | `/repositories/:id/starred` | JWT | Star state |
| POST | `/repositories/:id/sections` | JWT | Add section (owner) |
| PATCH | `/repositories/:id/sections/:sectionId` | JWT | Update section (owner) |
| DELETE | `/repositories/:id/sections/:sectionId` | JWT | Delete section (owner) |
| POST | `/repositories/:id/sections/:sectionId/note` | JWT | Create note (owner) |
| PATCH | `/repositories/:id/notes/:noteId` | JWT | Save note + create version (owner) |
| GET | `/repositories/:id/notes/:noteId` | JWT | Note + last 10 versions (read w/ access check) |
| GET | `/repositories/:id/notes/:noteId/versions` | JWT | Full version list |
| POST | `/merge-requests` | JWT | Submit MR from a fork |
| GET | `/merge-requests` | JWT | List (scope/repo/status filters) |
| GET | `/merge-requests/:id` | JWT | MR detail + flat diff |
| PATCH | `/merge-requests/:id` | JWT | Approve/reject (owner) |
| PATCH | `/merge-requests/:id/cancel` | JWT | Cancel (submitter) |
| POST | `/merge-requests/:id/comments` | JWT | Add comment |
| GET | `/profiles/:userId` | JWT | Public profile + stats |
| PATCH | `/profiles/:userId` | JWT | Edit own profile |
| POST | `/profiles/:userId/avatar` | JWT | Upload avatar (image ≤ 5 MB) |
| DELETE | `/profiles/:userId/avatar` | JWT | Delete avatar |

---

## 20. End-to-end scenario walkthrough

The "canonical" GitGud loop, tying every workflow together:

1. **Alice** signs up (§2) → lands on dashboard (§6).
2. Alice creates a **public** repository "Calculus Notes" with a section tree (e.g., *Limits* → *Derivatives*) (§7).
3. Alice opens `/repos/…` (owner → auto-redirect to edit, §10), creates a note, types rich text, saves a version (§10b).
4. **Bob** discovers "Calculus Notes" on `/discover` (§8), opens it read-only (§9), stars it (§12), and clicks **Fork** (§11). Bob now owns "Calculus Notes (fork)" with identical sections + notes, each tagged `originNoteId`.
5. Bob edits a note in his fork and saves versions (§10b).
6. Bob opens the **Submit Merge Request** modal and proposes his edited content (§13). The MR targets *Alice's* original note; `oldContent` snapshots it at creation.
7. Alice sees the MR in her `/merges` → Received tab (§14), opens `/merge-requests/[id]`, reads the **diff** side-by-side (§15), leaves a comment, and **approves** it — Alice's original note now holds Bob's content, a new version is recorded **credited to Bob** (`Approved merge request: <title>`), and the MR is marked approved (§15).
8. Carol forks Bob's fork, edits, and submits an MR targeting **Bob's** repo (note `originNoteId` chain) — the fork-of-fork case works because the MR's target resolves from the *fork's* parent repo (§13). Bob (as owner of that repo) approves or rejects with feedback.
9. Any MR Bob rejects/cancels freezes that branch of work; the submitter can edit again and submit a **new** MR (since the old one is no longer `pending`).

---

*Compiled from a direct reading of the backend (`backend/src`), frontend (`frontend/src/app`), and the Prisma schema (`backend/prisma/schema.prisma`).*