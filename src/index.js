import express from 'express';
import path from "path";
import { fileURLToPath } from "url";
import tipsRouter from './routes/tipsRouter.js';
import jobsRouter from './routes/jobsRouter.js'
import forumRepliesRouter from './routes/forumRepliesRouter.js'
import forumThreadsRouter from './routes/forumThreadsRouter.js'
import applicationsRouter from './routes/applicationsRouter.js'
import companiesRouter from './routes/companiesRouter.js';
import profilesRouter from './routes/profilesRouter.js';
import alertsRouter from './routes/alertsRouter.js';
import reviewsRouter from './routes/reviewsRouter.js';

import dotenv from 'dotenv'
import { errorHandler } from './middlewares/errorHandler.js';
dotenv.config();

const app = express();

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

// Serve the frontend (static HTML/CSS/JS under /public)
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
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

app.use(errorHandler);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`)
});
