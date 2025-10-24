import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.send('✅ Route working');
});

export default router;
