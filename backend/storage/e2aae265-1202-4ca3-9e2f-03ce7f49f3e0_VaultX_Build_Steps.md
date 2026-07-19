# VaultX — Full Build Plan (Step-by-Step)

This turns the SRS into an actual build sequence. Each stage produces a **working, testable app** — you never have a half-broken system. Work top to bottom; don't skip ahead to blockchain/IPFS until the core product runs end-to-end.

Rough total timeline: **4–6 months** part-time, working through it steadily.

---

## STAGE 0 — Environment & Repo Setup (Week 1)

1. Install: Node.js (LTS), Java 21 + Maven, Docker Desktop, PostgreSQL (or run via Docker), Git.
2. Create repo `vaultx/` with two folders: `frontend/` and `backend/`.
3. `frontend/`: scaffold with `npm create vite@latest . -- --template react-ts`. Install Tailwind.
4. `backend/`: scaffold with Spring Initializr — dependencies: Spring Web, Spring Security, Spring Data JPA, PostgreSQL driver, Validation, Lombok.
5. Set up a local Postgres instance (Docker container is easiest: `docker run` with a named volume).
6. Get both apps running locally — a blank React page hitting a blank `/api/v1/ping` Spring Boot endpoint. **Goal: prove the two talk to each other before building anything real.**
7. Push to GitHub, add a basic `.gitignore` and README stub.

✅ **Milestone check:** frontend calls backend, backend returns JSON, you see it in the browser.

---

## STAGE 1 — Auth (Weeks 2–4)

**Backend:**
1. Create `users` table (migration via Flyway).
2. Build register endpoint: hash password with BCrypt/Argon2, save user.
3. Build login endpoint: verify password, issue a JWT (Spring Security + jjwt library).
4. Add a JWT filter so protected endpoints require `Authorization: Bearer <token>`.
5. Add refresh token endpoint (store refresh tokens in a `sessions` table).
6. Add `/auth/me` endpoint returning the logged-in user's profile.

**Frontend:**
7. Build Register and Login pages (forms, validation, error states).
8. Store access token in memory (React state/context), refresh token in httpOnly cookie handling.
9. Build an auth context/provider + protected route wrapper.
10. Build a basic Dashboard page that only loads if logged in, showing "Welcome, {name}".

✅ **Milestone check:** you can register, log in, get redirected to a dashboard, refresh the page without losing session, and log out.

---

## STAGE 2 — Files & Folders, No Storage Tricks Yet (Weeks 5–8)

**Backend:**
1. Create `folders` and `files` tables.
2. Build folder CRUD endpoints (create, list children, rename, delete).
3. Build file upload endpoint — for now, store the raw file bytes to local disk (or a Postgres `bytea` column) and just save the path + metadata. **Skip encryption and IPFS for now.**
4. Build file list endpoint (by folder, with pagination).
5. Build file download endpoint (streams the file back).
6. Build soft-delete (recycle bin: `is_deleted`, `deleted_at`) + restore + permanent delete.
7. Enforce ownership: every file/folder endpoint checks `owner_id == currentUser.id`.

**Frontend:**
8. Build the file manager UI: folder tree sidebar, grid/list view of files.
9. Build drag-and-drop upload with a progress bar (start simple — one file, no chunking yet).
10. Build folder navigation (breadcrumbs, create/rename/delete folder).
11. Build recycle bin view + restore/delete-forever actions.

✅ **Milestone check:** you can create folders, upload files into them, see them listed, download them, delete and restore them. This is already a usable mini Google Drive.

---

## STAGE 3 — Search, Versioning, Preview (Weeks 9–10)

**Backend:**
1. Add filename search (Postgres `ILIKE` or full-text search) + filters (type, date, tag).
2. Add `file_versions` table — on re-upload of same filename/id, keep the old version instead of overwriting.
3. Add version list + restore endpoint.

**Frontend:**
4. Build search bar + filter UI.
5. Build a file detail panel: preview (images/PDF inline), version history list with restore button.
6. Add tags UI (add/remove tags on a file).

✅ **Milestone check:** search works, re-uploading a file keeps history, you can preview common file types.

---

## STAGE 4 — Sharing & Permissions (Weeks 11–13)

**Backend:**
1. Create `shares` and `permissions` tables.
2. Build "create share link" endpoint (public/private, optional password, optional expiry).
3. Build public share-resolve endpoint (no auth required, validates password/expiry).
4. Build permission grant/revoke endpoints (viewer/editor levels).
5. Enforce permission checks on file endpoints (owner OR has valid permission/share).

**Frontend:**
6. Build the Share modal: link type toggle, password field, expiry picker, copy-link button.
7. Build a "Shared with me" view.
8. Build a public share landing page (works without login, shows file + download button).

✅ **Milestone check:** you can share a file two ways (public link, specific user), the recipient can view/download within the rules you set, and expired/wrong-password links are rejected.

---

## STAGE 5 — Real Security Layer (Weeks 14–16)

This is where it becomes genuinely "enterprise-grade" instead of a CRUD app.

**Frontend (client-side crypto):**
1. Implement WebCrypto AES-256-GCM: generate a random DEK per file, encrypt the file bytes in the browser before upload.
2. Implement key wrapping: generate/store a user keypair, wrap the DEK with the owner's public key.
3. Update download flow: fetch ciphertext, unwrap DEK, decrypt client-side, then preview/save.
4. Update the share flow: when sharing, re-wrap the DEK with the recipient's public key too.

**Backend:**
5. Add MFA (TOTP) enrollment + login challenge.
6. Add rate limiting (Redis token bucket) on login and upload endpoints.
7. Add the `audit_logs` table + log every security-relevant action (login, share, permission change, delete).
8. Add CSRF/CSP headers, tighten CORS, add input validation everywhere it's missing.

✅ **Milestone check:** the server can no longer read your file contents even if the DB is dumped — only ciphertext is stored. MFA and audit logs work.

---

## STAGE 6 — Chunked/Resumable Upload (Week 17)

1. Backend: add upload-session endpoints (`init`, `chunk/{n}`, `complete`) backed by Redis for session state.
2. Frontend: split large files into chunks client-side, upload sequentially with retry/resume, show real progress.

✅ **Milestone check:** a large file upload can survive a page refresh / network blip and resume.

---

## STAGE 7 — Swap Storage to IPFS (Weeks 18–19)

1. Run a local IPFS (Kubo) node via Docker; learn the HTTP API basics (`add`, `cat`, `pin`).
2. Replace the "save to disk" step in your upload-complete logic with "push ciphertext blob to IPFS, store the returned CID instead of a file path."
3. Replace the download logic to fetch by CID instead of by path.
4. Add a pinning service (or a second IPFS node) for redundancy.

✅ **Milestone check:** files are now stored via IPFS CIDs; content is still encrypted, server never had plaintext, and the app's outward behavior hasn't changed for the user.

---

## STAGE 8 — Containerize Everything (Week 20)

1. Write a `Dockerfile` for frontend, one for backend.
2. Write `docker-compose.yml`: postgres, redis, ipfs, backend, frontend, all networked together.
3. Move all secrets/config to environment variables (no hardcoded values).
4. Verify: `docker compose up` brings up the entire app from a clean machine.

✅ **Milestone check:** anyone can clone the repo, run one command, and get a working VaultX instance.

---

## STAGE 9 — Blockchain Anchoring (Weeks 21–23)

1. Learn Solidity basics; write `VaultXRegistry.sol` with `anchorFile(hash, cid, timestamp)` and `verifyFile(hash)`.
2. Set up Hardhat, write contract tests, deploy to Sepolia testnet (get free Sepolia ETH from a faucet).
3. Build a small async worker (Node/ethers.js or Java/Web3j) that listens for "file uploaded" events and submits the anchor transaction.
4. Add a message queue (RabbitMQ) between the backend and this worker so anchoring never blocks uploads.
5. Add a `blockchain_anchors` table + status badge in the UI (pending/confirmed).
6. Add a "verify integrity" button that recomputes the file hash client-side and compares to the on-chain record.

✅ **Milestone check:** every upload eventually gets an on-chain anchor, visible in the UI, verifiable independently.

---

## STAGE 10 — Admin Panel & Analytics (Weeks 24–25)

1. Add role field + admin-only route guards (backend + frontend).
2. Build admin endpoints: list/suspend users, storage analytics aggregation queries, audit log search.
3. Build the admin dashboard UI: charts (storage growth, active users), user table, log viewer.

✅ **Milestone check:** an admin account can see platform-wide stats and manage users; regular users can't reach these routes.

---

## STAGE 11 — Polish, Testing, CI/CD (Weeks 26–28)

1. Add unit tests (JUnit for backend logic, Vitest for frontend) for the riskiest paths: auth, permission checks, crypto wrapping.
2. Add integration tests (Testcontainers spinning up real Postgres/Redis).
3. Add a couple of end-to-end tests (Playwright): register → upload → share → download.
4. Set up GitHub Actions: run tests + lint on every push, build Docker images on merge to main.
5. Dark mode, mobile responsive pass, empty/error/loading states everywhere.
6. Write the README, installation guide, and API docs (generate Swagger UI from your Spring annotations).

✅ **Milestone check:** green CI pipeline, a stranger could clone the repo and get it running from the README alone.

---

## STAGE 12 — Deploy (Week 29+)

1. Pick a target: DigitalOcean App Platform (simplest) or AWS ECS (more "enterprise" for the portfolio story).
2. Set up managed Postgres + Redis, or run them in containers on the same host for a lean setup.
3. Point a domain at it, add TLS (Let's Encrypt / platform-managed cert).
4. Deploy the IPFS node or switch to a pinning service (Pinata/web3.storage) for reliability.
5. Set up basic monitoring (uptime check + error logging at minimum; Prometheus/Grafana if you want the full story).

✅ **Milestone check:** it's live at a real URL, you can demo it from your phone.

---

## How to actually work through this
- Treat each **Stage** as a mini-project with its own branch/PR.
- Don't move to the next stage until the milestone check passes — resist the urge to jump to blockchain because it's the "cool part."
- Commit after every working feature, not just at the end of a stage — small commits make debugging much easier.
- If a stage stalls for more than ~1.5x its estimated time, that's a signal to simplify scope, not push through — cut a feature (e.g. drop password-protected links) rather than abandon the stage.

Want me to start you on **Stage 0 + Stage 1** right now — an actual runnable scaffold (React shell + Spring Boot auth wired together)?
