import express from 'express';
import pool, { supabase } from '../db/pool.js';

const router = express.Router();

// --- Show New Supply Order Form (optional standalone route) ---
router.get('/new', async (req, res) => {
  try {
    const { data: suppliers } = await supabase.from('suppliers')
      .select('supplier_id, supplier_name')
      .eq('is_active', true)
      .order('supplier_name', { ascending: true });

    const { data: products } = await supabase.from('products')
      .select('product_code, product_name, price, stock')
      .eq('is_active', true)
      .order('product_name', { ascending: true });

    res.render('supply_orders/new', { suppliers, products });
  } catch (error) {
    console.error('Error loading new order form:', error);
    res.status(500).send('Error loading form');
  }
});

// --- Create New Supply Order (also used internally by supplier form) ---
router.post('/', async (req, res) => {
  const { supplier_id, items } = req.body;

  if (!supplier_id || !items || !Array.isArray(items)) {
    return res.status(400).send('Invalid data');
  }

  try {
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.cost_price,
      0
    );

    // Step 1: Insert into supply_orders
    const { data: orderData, error: orderError } = await supabase
      .from('supply_orders')
      .insert([{ supplier_id, total_amount: totalAmount }])
      .select('order_num')
      .single();

    if (orderError) throw orderError;
    const order_num = orderData.order_num;

    // Step 2: Insert into supply_order_details
    const detailRows = items.map(i => ({
      order_num,
      product_code: i.product_code,
      quantity: i.quantity,
      cost_price: i.cost_price
    }));

    const { error: detailsError } = await supabase
      .from('supply_order_details')
      .insert(detailRows);

    if (detailsError) throw detailsError;

    // The trigger automatically updates stock
    res.status(200).send('Supply order created successfully');
  } catch (error) {
    console.error('Error creating supply order:', error);
    res.status(500).send('Error creating supply order');
  }
});

export default router;
