import express from 'express';
import tipsRouter from './routes/tipsRouter.js';
import jobsRouter from './routes/jobsRouter.js'
import forumRepliesRouter from './routes/forumRepliesRouter.js'
import forumThreadsRouter from './routes/forumThreadsRouter.js'
import applicationsRouter from './routes/applicationsRouter.js'
import companiesRouter from './routes/companiesRouter.js';
import profilesRouter from './routes/profilesRouter.js';
import alertsRouter from './routes/alertsRouter.js';
import reviewsRouter from './routes/reviewsRouter.js';
import adminUsersRouter from "./routes/adminUsersRouter.js";
import adminJobsRouter from "./routes/adminJobsRouter.js";
import adminModerationRouter from "./routes/adminModerationRouter.js";

import dotenv from 'dotenv'
import { errorHandler } from './middlewares/errorHandler.js';
dotenv.config();

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/', (req, res) => {
  res.send('Hola mundo');
});

app.use('/jobs', jobsRouter);
app.use('/tips', tipsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/forum_replies', forumRepliesRouter);
app.use('/forum_threads', forumThreadsRouter);
app.use('/applications', applicationsRouter);
app.use('/alerts', alertsRouter);
app.use('/reviews', reviewsRouter);

// Admin API (protected via requireAdmin middleware)
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/jobs", adminJobsRouter);
app.use("/api/admin/moderation", adminModerationRouter);

app.use(errorHandler);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`)
});
