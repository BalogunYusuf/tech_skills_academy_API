# TechLearn Academy Backend

Complete Node.js/Express/MongoDB backend for the TechLearn Academy platform. This fills in
everything the original setup guide described but didn't fully provide: the `Course`,
`Material`, `Assignment`, `Quiz`, and `Announcement` models, every controller, every route file,
and a hardened `server.js`.

## What was added beyond the original guide

- **Models**: `Course.js`, `Material.js`, `Assignment.js`, `Quiz.js`, `Announcement.js` (only `User.js` was fully written before)
- **Controllers**: `userController.js`, `courseController.js`, `assignmentController.js`, `quizController.js`, `announcementController.js`, and a corrected `materialController.js`
- **Routes**: `auth.js`, `users.js`, `courses.js`, `materials.js`, `assignments.js`, `quizzes.js`, `announcements.js` — all referenced by `server.js` but missing from the guide
- **`config/cloudinary.js`**: the Cloudinary config block the guide showed inline but never put in its own file
- **`middleware/errorHandler.js`**: centralized error + 404 handling
- **Bug fixes**:
  - `middleware/auth.js` was missing `return` statements, which would crash with "headers already sent" errors after an invalid token
  - `middleware/upload.js` now supports both Cloudinary (memory storage) and local disk storage via `STORAGE_MODE`, and creates the uploads folder if missing
  - `materialController.js` now checks that the target course exists and uses a proper buffer-to-stream conversion for Cloudinary uploads
  - Quiz attempts are scored server-side and correct answers are stripped from what students receive, so answers can't be read from the API response
- **Security wired into `server.js`**: `helmet`, `express-rate-limit`, and `express-mongo-sanitize` were mentioned in the guide's Security section but never actually added to the server
- **`seed.js`**: creates a demo admin, instructor, student, and course so you can log in and test immediately after deploying
- **`Procfile`** and **`.env.example`** for faster Railway/Heroku deployment

## Quick start

```bash
npm install
cp .env.example .env   # then fill in MONGODB_URI, JWT_SECRET, and Cloudinary keys
npm run seed            # optional: creates demo admin/instructor/student + a sample course
npm run dev              # starts on http://localhost:5000 with nodemon
```

Demo accounts created by `npm run seed` (all use password `Password123!`):

| Role       | Email                        |
|------------|-------------------------------|
| admin      | admin@techlearn.test          |
| instructor | instructor@techlearn.test     |
| student    | student@techlearn.test        |

## Storage modes

Set `STORAGE_MODE=cloudinary` (default) to upload files to Cloudinary, or `STORAGE_MODE=local`
to write files to `uploads/materials/` on disk and serve them from `/uploads/...`. Local mode is
useful for quick local testing without Cloudinary credentials; use Cloudinary (or another object
store) for real deployments, since most hosts like Railway/Heroku have ephemeral filesystems.

## Deploying

1. **Database**: create a free cluster at MongoDB Atlas, whitelist `0.0.0.0/0` (or your host's IPs), and copy the connection string into `MONGODB_URI`.
2. **Backend**: push this repo to GitHub, connect it to Railway (or Render/Heroku), and set all variables from `.env.example` in the host's dashboard. The included `Procfile` (`web: node server.js`) works for Heroku/Railway-style buildpacks.
3. **File storage**: create a free Cloudinary account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
4. **CORS**: set `CLIENT_URLS` to a comma-separated list of your deployed frontend URL(s) — the server only allows those origins.
5. **Frontend**: point your frontend's API base URL at the deployed backend URL and redeploy it (Netlify/Vercel/GitHub Pages).
6. Hit `GET /api/health` on the deployed URL to confirm it's live.

## Endpoints

See the original setup guide for the full endpoint table — every route listed there (auth, users,
courses, materials, assignments, quizzes) is implemented, plus `/api/announcements` for the
`Announcements` collection the guide's schema defined but never exposed via routes.
