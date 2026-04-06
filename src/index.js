import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import jobsRouter from './routes/jobsRouter.js';
import companiesRouter from './routes/companiesRouter.js';
import profilesRouter from './routes/profilesRouter.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hola mundo');
});


app.use('/jobs', jobsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/profiles', profilesRouter);

app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000}`)
});