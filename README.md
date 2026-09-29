# TechSkills Academy Backend

Complete Node.js/Express/MongoDB backend for the TechSkills Academy platform. This fills in
everything the original setup guide described but didn't fully provide: the `Course`,
`Material`, `Assignment`, `Quiz`, and `Announcement` models, every controller, every route file,
and a hardened `server.js`.

## What was added after taking the project

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


