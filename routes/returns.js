import express from 'express';
import { supabase } from '../db/pool.js';
const router = express.Router();

// GET /returns - List all returns
router.get('/', async (req, res) => {
  try {
    const { data: returns, error } = await supabase
      .from('returns')
      .select('*')
      .order('return_date', { ascending: false });

    if (error) throw error;

    // Get additional data separately
    for (let ret of returns) {
      // Get invoice details
      const { data: invoice } = await supabase
        .from('sales_invoices')
        .select('invoice_timestamp, customers(customer_name), employees(emp_name)')
        .eq('invoice_num', ret.invoice_num)
        .single();
      ret.sales_invoices = invoice || {};

      // Get product details
      const { data: product } = await supabase
        .from('products')
        .select('product_name, price')
        .eq('product_code', ret.product_code)
        .single();
      ret.products = product || {};

      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('emp_name')
        .eq('emp_id', ret.process_emp_id)
        .single();
      ret.employees = employee || {};
    }

    res.render('returns', { returns });
  } catch (err) {
    console.error('Error fetching returns:', err);
    res.status(500).send('Error fetching returns');
  }
});

// GET /returns/new - Show form to create new return
router.get('/new', async (req, res) => {
  try {
    // Get all invoices for selection
    const { data: invoices, error: invoiceError } = await supabase
      .from('sales_invoices')
      .select('invoice_num, invoice_timestamp')
      .order('invoice_timestamp', { ascending: false });

    if (invoiceError) throw invoiceError;

    // Get customer and sales details for each invoice
    for (let invoice of invoices) {
      const { data: customer } = await supabase
        .from('sales_invoices')
        .select('customers(customer_name)')
        .eq('invoice_num', invoice.invoice_num)
        .single();
      invoice.customers = customer?.customers || {};

      const { data: salesDetails } = await supabase
        .from('sales_details')
        .select('product_code, quantity, selling_price, products(product_name)')
        .eq('invoice_num', invoice.invoice_num);
      invoice.sales_details = salesDetails || [];
    }

    // Get all employees for processing
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('emp_id, emp_name')
      .eq('is_active', true);

    if (empError) throw empError;

    res.render('returns/new', { invoices, employees });
  } catch (err) {
    console.error('Error loading new return form:', err);
    res.status(500).send('Error loading form');
  }
});

// POST /returns - Create new return
router.post('/', async (req, res) => {
  try {
    const { invoice_num, product_code, quantity_returned, return_reason, refund_amount, process_emp_id } = req.body;

    // Validate that the product was actually sold in this invoice
    const { data: saleDetail, error: checkError } = await supabase
      .from('sales_details')
      .select('quantity')
      .eq('invoice_num', invoice_num)
      .eq('product_code', product_code)
      .single();

    if (checkError || !saleDetail) {
      return res.status(400).send('Invalid invoice or product combination');
    }

    // Check if quantity returned doesn't exceed sold quantity
    // Note: In a real system, you'd check against already returned quantities
    if (quantity_returned > saleDetail.quantity) {
      return res.status(400).send('Return quantity cannot exceed sold quantity');
    }

    const { data, error } = await supabase
      .from('returns')
      .insert([{
        invoice_num: parseInt(invoice_num),
        product_code,
        quantity_returned: parseInt(quantity_returned),
        return_reason,
        refund_amount: parseFloat(refund_amount),
        process_emp_id: parseInt(process_emp_id)
      }])
      .select();

    if (error) throw error;

    res.redirect('/returns');
  } catch (err) {
    console.error('Error creating return:', err);
    res.status(500).send('Error creating return');
  }
});

// GET /returns/:id - Show return details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: returnData, error } = await supabase
      .from('returns')
      .select('*')
      .eq('return_id', id)
      .single();

    if (error) throw error;

    // Get additional data
    const { data: invoice } = await supabase
      .from('sales_invoices')
      .select('invoice_timestamp, customers(customer_name), employees(emp_name)')
      .eq('invoice_num', returnData.invoice_num)
      .single();
    returnData.sales_invoices = invoice || {};

    const { data: product } = await supabase
      .from('products')
      .select('product_name, price')
      .eq('product_code', returnData.product_code)
      .single();
    returnData.products = product || {};

    const { data: employee } = await supabase
      .from('employees')
      .select('emp_name')
      .eq('emp_id', returnData.process_emp_id)
      .single();
    returnData.employees = employee || {};

    res.render('returns/show', { returnData });
  } catch (err) {
    console.error('Error fetching return:', err);
    res.status(500).send('Error fetching return');
  }
});

// GET /returns/:id/edit - Show form to edit return
router.get('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: returnData, error: returnError } = await supabase
      .from('returns')
      .select('*')
      .eq('return_id', id)
      .single();

    if (returnError) throw returnError;

    // Get employees for processing
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('emp_id, emp_name')
      .eq('is_active', true);

    if (empError) throw empError;

    res.render('returns/edit', { returnData, employees });
  } catch (err) {
    console.error('Error loading edit form:', err);
    res.status(500).send('Error loading form');
  }
});

// PUT /returns/:id - Update return
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { return_reason, refund_amount, process_emp_id } = req.body;

    const { error } = await supabase
      .from('returns')
      .update({
        return_reason,
        refund_amount: parseFloat(refund_amount),
        process_emp_id: parseInt(process_emp_id)
      })
      .eq('return_id', id);

    if (error) throw error;

    res.redirect('/returns');
  } catch (err) {
    console.error('Error updating return:', err);
    res.status(500).send('Error updating return');
  }
});

// DELETE /returns/:id - Delete return
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('returns')
      .delete()
      .eq('return_id', id);

    if (error) throw error;

    res.redirect('/returns');
  } catch (err) {
    console.error('Error deleting return:', err);
    res.status(500).send('Error deleting return');
  }
});

export default router;
