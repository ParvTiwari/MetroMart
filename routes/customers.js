import express from 'express';
import { supabase } from '../db/pool.js';
const router = express.Router();

// GET /customers - List all customers
router.get('/', async (req, res) => {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('registration_date', { ascending: false });

    if (error) throw error;

    res.render('customers', { customers });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).send('Error fetching customers');
  }
});

// GET /customers/new - Show form to create new customer
router.get('/new', (req, res) => {
  res.render('customers/new');
});

// POST /customers - Create new customer
router.post('/', async (req, res) => {
  try {
    const { customer_name, mobile, email, address } = req.body;

    const { data, error } = await supabase
      .from('customers')
      .insert([{ customer_name, mobile, email, address }])
      .select();

    if (error) throw error;

    res.redirect('/customers');
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).send('Error creating customer');
  }
});

// GET /customers/:id - Show customer details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', id)
      .single();

    if (error) throw error;

    res.render('customers/show', { customer });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).send('Error fetching customer');
  }
});

// GET /customers/:id/edit - Show form to edit customer
router.get('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', id)
      .single();

    if (error) throw error;

    res.render('customers/edit', { customer });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).send('Error fetching customer');
  }
});

// PUT /customers/:id - Update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, mobile, email, address } = req.body;

    const { error } = await supabase
      .from('customers')
      .update({ customer_name, mobile, email, address })
      .eq('customer_id', id);

    if (error) throw error;

    res.redirect('/customers');
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).send('Error updating customer');
  }
});

// DELETE /customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('customer_id', id);

    if (error) throw error;

    res.redirect('/customers');
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).send('Error deleting customer');
  }
});

export default router;
