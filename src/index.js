import express from 'express';
import jobsRouter from './routes/jobsRouter.js'
import forumRepliesRouter from './routes/forumRepliesRouter.js'
import forumThreadsRouter from './routes/forumThreadsRouter.js'
import applicationsRouter from './routes/applicationsRouter.js'
import dotenv from 'dotenv'
import { errorHandler } from './middlewares/errorHandler.js';
dotenv.config();

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hola mundo');
});

app.use('/jobs', jobsRouter)
app.use('/forum_replies', forumRepliesRouter)
app.use('/forum_threads', forumThreadsRouter)
app.use('/applications', applicationsRouter);

app.use(errorHandler);

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`)
})