require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');
const { configurePassport } = require('./config/passport');

// Routes
const landingRoutes = require('./routes/landing');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const researchRoutes = require('./routes/research');
const builderRoutes = require('./routes/builder');
const tutorRoutes = require('./routes/tutor');
const boardroomRoutes = require('./routes/boardroom');
const workspaceRoutes = require('./routes/workspace');
const profileRoutes = require('./routes/profile');
const analyticsRoutes = require('./routes/analytics');
const deploymentRoutes = require('./routes/deployment');
const marketplaceRoutes = require('./routes/marketplace');
const databaseRoutes = require('./routes/database');

const app = express();

// Connect to database
connectDB();

// Configure passport
configurePassport();

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'axiom-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

if (process.env.MONGODB_URI) {
  try {
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
    });
  } catch (err) {
    console.warn('⚠️  Could not initialize MongoDB session store — falling back to in-memory sessions. Logins will not persist across server restarts until MONGODB_URI is fixed.');
  }
} else {
  console.warn('⚠️  MONGODB_URI is not set — using in-memory sessions. Logins will not persist across server restarts. Add MONGODB_URI to .env to fix this.');
}

app.use(session(sessionConfig));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Global locals for views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', landingRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/research', researchRoutes);
app.use('/builder', builderRoutes);
app.use('/tutor', tutorRoutes);
app.use('/boardroom', boardroomRoutes);
app.use('/workspace', workspaceRoutes);
app.use('/profile', profileRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/deployment', deploymentRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/database', databaseRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: '404 — Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Something went wrong',
    message: 'We encountered an unexpected issue. Please try again.',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Axiom Cloud running at http://localhost:${PORT}\n`);
});

module.exports = app;
