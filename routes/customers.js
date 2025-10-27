import express from 'express';
import pool from '../db/pool.js';
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers');
    res.render('customers', { customers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching customers');
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;
    await pool.query('INSERT INTO customers (name, email) VALUES ($1, $2)', [name, email]);
    res.redirect('/customers');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding customer');
  }
});

export default router;
