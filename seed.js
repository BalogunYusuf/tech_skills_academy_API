// Seed script: creates YOUR admin account (from .env) plus a configurable
// number of staff (instructor) accounts, and a sample course.
// Run with: npm run seed
//
// Configure via .env (all optional - sensible defaults are used if omitted):
//   ADMIN_EMAIL=you@yourschool.com
//   ADMIN_PASSWORD=SomeStrongPassword123!
//   ADMIN_FIRST_NAME=Jane
//   ADMIN_LAST_NAME=Doe
//   STAFF_COUNT=5                 -> how many instructor accounts to create
//   STAFF_EMAIL_PREFIX=instructor -> emails become instructor1@techlearn.test, instructor2@..., etc.
//   STAFF_PASSWORD=Password123!   -> shared password for all generated staff (change after first login)
//   STAFF_EMAIL_DOMAIN=techlearn.test
//   SEED_STUDENT=true             -> set to "false" to skip creating the demo student

const dotenv = require('dotenv');
const connectDB = require('./config/database');
const User = require('./models/User');
const Course = require('./models/Course');
const Quiz = require('./models/Quiz');
const Assignment = require('./models/Assignment');
const Announcement = require('./models/Announcement');
const Setting = require('./models/Setting');

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@techlearn.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password123!';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Ada';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Admin';

const STAFF_COUNT = parseInt(process.env.STAFF_COUNT || '3', 10);
const STAFF_EMAIL_PREFIX = process.env.STAFF_EMAIL_PREFIX || 'instructor';
const STAFF_EMAIL_DOMAIN = process.env.STAFF_EMAIL_DOMAIN || 'techlearn.test';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'Password123!';

const SEED_STUDENT = (process.env.SEED_STUDENT || 'true').toLowerCase() !== 'false';
const STUDENT_EMAIL = 'student@techlearn.test';

const seed = async () => {
  await connectDB();

  try {
    // Build the list of staff emails we're about to (re)create, so we only
    // clear out the exact demo/staff accounts this run will touch - not
    // any unrelated real users already in the database.
    const staffEmails = Array.from(
      { length: STAFF_COUNT },
      (_, i) => `${STAFF_EMAIL_PREFIX}${i + 1}@${STAFF_EMAIL_DOMAIN}`
    );
    const emailsToClear = [ADMIN_EMAIL, ...staffEmails];
    if (SEED_STUDENT) emailsToClear.push(STUDENT_EMAIL);

    console.log('Clearing any existing accounts with these emails...');
    await User.deleteMany({ email: { $in: emailsToClear } });

    // --- Admin (your own account, from .env) ---
    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      role: 'admin'
    });

    // --- Staff / instructors (as many as STAFF_COUNT) ---
    const instructors = [];
    for (let i = 0; i < STAFF_COUNT; i++) {
      const instructor = await User.create({
        email: staffEmails[i],
        password: STAFF_PASSWORD,
        firstName: `Instructor${i + 1}`,
        lastName: 'Staff',
        role: 'instructor',
        staffId: `STF${1000 + i + 1}`,
        department: 'General'
      });
      instructors.push(instructor);
    }

    // --- Optional demo student ---
    let student = null;
    if (SEED_STUDENT) {
      student = await User.create({
        email: STUDENT_EMAIL,
        password: 'Password123!',
        firstName: 'Sam',
        lastName: 'Student',
        role: 'student',
        studentId: 'STU1001'
      });
    }

    // --- Sample course, owned by the first instructor ---
    const course = await Course.create({
      title: 'Intro to Web Development',
      description: 'A beginner-friendly course covering HTML, CSS, and JavaScript basics.',
      instructor: instructors[0]._id,
      category: 'Web Development',
      level: 'Beginner',
      duration: '6 weeks',
      price: 0,
      isPublished: true
    });

    // --- Sample assessments ---
    if (instructors.length > 0) {
      await Quiz.create({
        title: 'HTML & CSS Fundamentals Quiz',
        course: course._id,
        instructor: instructors[0]._id,
        type: 'quiz',
        duration: 20,
        questions: [
          { questionText: 'What does HTML stand for?', options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Mode Language', 'Home Tool Markup Language'], correctAnswer: 0, points: 5 },
          { questionText: 'Which CSS property changes text colour?', options: ['font-style', 'color', 'text-fill', 'foreground'], correctAnswer: 1, points: 5 },
          { questionText: 'Which tag creates a hyperlink?', options: ['<link>', '<a>', '<href>', '<url>'], correctAnswer: 1, points: 5 }
        ]
      });

      await Quiz.create({
        title: 'End of Term Examination - Web Development',
        course: course._id,
        instructor: instructors[0]._id,
        type: 'exam',
        duration: 60,
        startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: [
          { questionText: 'Which HTTP method is used to submit form data?', options: ['GET', 'POST', 'HEAD', 'TRACE'], correctAnswer: 1, points: 10 },
          { questionText: 'JavaScript is a ___-side scripting language.', options: ['client', 'server', 'both client and server', 'neither'], correctAnswer: 2, points: 10 }
        ]
      });

      await Assignment.create({
        title: 'Build a Personal Portfolio Page',
        description: 'Create a single-page portfolio using HTML and CSS. Submit a link to your hosted page.',
        course: course._id,
        instructor: instructors[0]._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        totalPoints: 100
      });

      await Announcement.create({
        title: 'Welcome to TechSkills Academy',
        content: 'Lecture materials for week 1 are now available. Check the materials section and complete your first quiz.',
        course: course._id,
        instructor: instructors[0]._id
      });
    }

    await Setting.findOneAndUpdate(
      { key: 'platform' },
      { $setOnInsert: { key: 'platform', siteName: 'TechSkills Academy', registrationOpen: true, defaultSession: '2026/2027' } },
      { upsert: true, new: true }
    );

    console.log('\nSeed complete:');
    console.log(`  Admin:      ${admin.email} / ${ADMIN_PASSWORD}`);
    instructors.forEach((instr) => {
      console.log(`  Instructor: ${instr.email} / ${STAFF_PASSWORD}`);
    });
    if (student) {
      console.log(`  Student:    ${student.email} / Password123!`);
    }
    console.log(`  Course:     ${course.title} (${course._id})`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

seed();
