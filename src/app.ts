import { corsMiddleware } from '#middleware/cors.js';
import authRoutes from '#routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import express from 'express';

const app = express();
const port = '3000';

app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
