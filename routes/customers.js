import express from 'express';
import pool from '../db/pool.js';
const router = express.Router();

// GET /customers - List all customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY registration_date DESC');
    const customers = result.rows;
    res.render('customers', { customers });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).send('Error fetching customers');
  }
});

// GET /customers/new - Show form
router.get('/new', (req, res) => {
  res.render('customers/new');
});

// POST /customers - create new customer
router.post('/', async (req, res) => {
  try {
    const { customer_name, mobile, email, address } = req.body;
    const text = 'INSERT INTO customers (customer_name, mobile, email, address) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [customer_name, mobile, email, address];
    await pool.query(text, values);
    res.redirect('/customers');
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).send('Error creating customer');
  }
});

// GET /customers/:id - show customer details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const text = 'SELECT * FROM customers WHERE customer_id = $1';
    const result = await pool.query(text, [id]);
    const customer = result.rows[0];
    res.render('customers/show', { customer });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).send('Error fetching customer');
  }
});

// GET /customers/:id/edit - show edit form
router.get('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const text = 'SELECT * FROM customers WHERE customer_id = $1';
    const result = await pool.query(text, [id]);
    const customer = result.rows[0];
    res.render('customers/edit', { customer });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).send('Error fetching customer');
  }
});

// PUT /customers/:id - update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, mobile, email, address } = req.body;
    const text = 'UPDATE customers SET customer_name=$1, mobile=$2, email=$3, address=$4 WHERE customer_id=$5';
    const values = [customer_name, mobile, email, address, id];
    await pool.query(text, values);
    res.redirect('/customers');
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).send('Error updating customer');
  }
});

// DELETE /customers/:id - delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const text = 'DELETE FROM customers WHERE customer_id=$1';
    await pool.query(text, [id]);
    res.redirect('/customers');
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).send('Error deleting customer');
  }
});

export default router;
