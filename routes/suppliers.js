import express from 'express';
import pool, { supabase } from '../db/pool.js';

const router = express.Router();

const supabaseAvailable = Boolean(supabase);

// --- Suppliers CRUD ---

// List all suppliers
router.get('/', async (req, res) => {
  try {
    let suppliers = [];

    // Try Postgres first
    try {
      const { rows } = await pool.query(
        'SELECT supplier_id, supplier_name, contact_person, mobile, email, address, registration_date, is_active FROM suppliers ORDER BY supplier_name ASC'
      );
      suppliers = rows.map(row => ({
        ...row,
        registration_date: row.registration_date ? new Date(row.registration_date).toISOString().split('T')[0] : null
      }));
    } catch (pgErr) {
      console.error('Error loading suppliers from Postgres:', pgErr);
    }

    // Fallback to Supabase if no data from Postgres
    if (!suppliers.length && supabaseAvailable) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('supplier_id, supplier_name, contact_person, mobile, email, address, registration_date, is_active')
          .order('supplier_name', { ascending: true });

        if (error) throw error;
        suppliers = (data || []).map(row => ({
          ...row,
          registration_date: row.registration_date ? new Date(row.registration_date).toISOString().split('T')[0] : null
        }));
      } catch (supErr) {
        console.error('Error loading suppliers from Supabase:', supErr);
      }
    }

    res.render('suppliers', { suppliers });
  } catch (err) {
    console.error('Error loading suppliers:', err);
    res.status(500).send('Error loading suppliers');
  }
});

// Show form to create new supplier
router.get('/new', (req, res) => {
  res.render('suppliers/new');
});

// Create new supplier
router.post('/', async (req, res) => {
  const { supplier_name, contact_person, mobile, email, address } = req.body;

  if (!supplier_name || !contact_person || !mobile || !email || !address) {
    return res.status(400).send('All fields are required');
  }

  try {
    // Try Postgres first
    try {
      await pool.query(
        'INSERT INTO suppliers (supplier_name, contact_person, mobile, email, address) VALUES ($1, $2, $3, $4, $5)',
        [supplier_name, contact_person, mobile, email, address]
      );
    } catch (pgErr) {
      console.error('Error creating supplier via Postgres:', pgErr);
      // Fallback to Supabase
      if (supabaseAvailable) {
        const { error } = await supabase
          .from('suppliers')
          .insert([{ supplier_name, contact_person, mobile, email, address }]);
        if (error) throw error;
      } else {
        throw pgErr;
      }
    }
    res.redirect('/suppliers');
  } catch (err) {
    console.error('Error creating supplier:', err);
    res.status(500).send('Error creating supplier');
  }
});

// Show supplier details
router.get('/:id', async (req, res) => {
  const supplierId = Number(req.params.id);
  if (!supplierId) {
    return res.status(404).send('Supplier not found');
  }

  try {
    let supplier = null;
    let supplyOrders = [];

    // Try Postgres first
    try {
      const supplierResult = await pool.query(
        'SELECT supplier_id, supplier_name, contact_person, mobile, email, address, registration_date, is_active FROM suppliers WHERE supplier_id = $1',
        [supplierId]
      );

      if (supplierResult.rows.length) {
        supplier = {
          ...supplierResult.rows[0],
          registration_date: supplierResult.rows[0].registration_date ? new Date(supplierResult.rows[0].registration_date).toISOString().split('T')[0] : null
        };

        const ordersResult = await pool.query(
          `SELECT so.order_num, so.order_date, so.total_amount,
                  COUNT(sod.product_code) as items_count
           FROM supply_orders so
           LEFT JOIN supply_order_details sod ON so.order_num = sod.order_num
           WHERE so.supplier_id = $1
           GROUP BY so.order_num, so.order_date, so.total_amount
           ORDER BY so.order_date DESC`,
          [supplierId]
        );

        supplyOrders = ordersResult.rows.map(row => ({
          ...row,
          order_date: row.order_date ? new Date(row.order_date).toISOString().split('T')[0] : null,
          total_amount: Number(row.total_amount) || 0,
          items_count: Number(row.items_count) || 0
        }));
      }
    } catch (pgErr) {
      console.error('Error loading supplier from Postgres:', pgErr);
    }

    // Fallback to Supabase
    if (!supplier && supabaseAvailable) {
      try {
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('supplier_id, supplier_name, contact_person, mobile, email, address, registration_date, is_active')
          .eq('supplier_id', supplierId)
          .maybeSingle();

        if (supplierError) throw supplierError;
        if (supplierData) {
          supplier = {
            ...supplierData,
            registration_date: supplierData.registration_date ? new Date(supplierData.registration_date).toISOString().split('T')[0] : null
          };

          const { data: ordersData, error: ordersError } = await supabase
            .from('supply_orders')
            .select(`
              order_num,
              order_date,
              total_amount,
              supply_order_details (product_code)
            `)
            .eq('supplier_id', supplierId)
            .order('order_date', { ascending: false });

          if (ordersError) throw ordersError;
          supplyOrders = (ordersData || []).map(row => ({
            order_num: row.order_num,
            order_date: row.order_date ? new Date(row.order_date).toISOString().split('T')[0] : null,
            total_amount: Number(row.total_amount) || 0,
            items_count: (row.supply_order_details || []).length
          }));
        }
      } catch (supErr) {
        console.error('Error loading supplier from Supabase:', supErr);
      }
    }

    if (!supplier) {
      return res.status(404).send('Supplier not found');
    }

    res.render('suppliers/show', { supplier, supplyOrders });
  } catch (err) {
    console.error('Error loading supplier:', err);
    res.status(500).send('Error loading supplier');
  }
});

// Show edit form
router.get('/:id/edit', async (req, res) => {
  const supplierId = Number(req.params.id);
  if (!supplierId) {
    return res.status(404).send('Supplier not found');
  }

  try {
    let supplier = null;

    // Try Postgres first
    try {
      const { rows } = await pool.query(
        'SELECT supplier_id, supplier_name, contact_person, mobile, email, address, registration_date, is_active FROM suppliers WHERE supplier_id = $1',
        [supplierId]
      );
      if (rows.length) {
        supplier = {
          ...rows[0],
          registration_date: rows[0].registration_date ? new Date(rows[0].registration_date).toISOString().split('T')[0] : null
        };
      }
    } catch (pgErr) {
      console.error('Error loading supplier for edit from Postgres:', pgErr);
    }

    // Fallback to Supabase
    if (!supplier && supabaseAvailable) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('supplier_id, supplier_name, contact_person, mobile, email, address, registration_date, is_active')
          .eq('supplier_id', supplierId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          supplier = {
            ...data,
            registration_date: data.registration_date ? new Date(data.registration_date).toISOString().split('T')[0] : null
          };
        }
      } catch (supErr) {
        console.error('Error loading supplier for edit from Supabase:', supErr);
      }
    }

    if (!supplier) {
      return res.status(404).send('Supplier not found');
    }

    res.render('suppliers/edit', { supplier });
  } catch (err) {
    console.error('Error loading supplier for edit:', err);
    res.status(500).send('Error loading supplier');
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  const supplierId = Number(req.params.id);
  const { supplier_name, contact_person, mobile, email, address, is_active } = req.body;

  if (!supplierId || !supplier_name || !contact_person || !mobile || !email || !address) {
    return res.status(400).send('All fields are required');
  }

  try {
    // Try Postgres first
    try {
      await pool.query(
        'UPDATE suppliers SET supplier_name = $1, contact_person = $2, mobile = $3, email = $4, address = $5, is_active = $6 WHERE supplier_id = $7',
        [supplier_name, contact_person, mobile, email, address, is_active === 'on', supplierId]
      );
    } catch (pgErr) {
      console.error('Error updating supplier via Postgres:', pgErr);
      // Fallback to Supabase
      if (supabaseAvailable) {
        const { error } = await supabase
          .from('suppliers')
          .update({ supplier_name, contact_person, mobile, email, address, is_active: is_active === 'on' })
          .eq('supplier_id', supplierId);
        if (error) throw error;
      } else {
        throw pgErr;
      }
    }
    res.redirect(`/suppliers/${supplierId}`);
  } catch (err) {
    console.error('Error updating supplier:', err);
    res.status(500).send('Error updating supplier');
  }
});

// Delete supplier (soft delete by setting is_active = false)
router.post('/:id/delete', async (req, res) => {
  const supplierId = Number(req.params.id);

  try {
    // Try Postgres first
    try {
      await pool.query('UPDATE suppliers SET is_active = false WHERE supplier_id = $1', [supplierId]);
    } catch (pgErr) {
      console.error('Error deleting supplier via Postgres:', pgErr);
      // Fallback to Supabase
      if (supabaseAvailable) {
        const { error } = await supabase
          .from('suppliers')
          .update({ is_active: false })
          .eq('supplier_id', supplierId);
        if (error) throw error;
      } else {
        throw pgErr;
      }
    }
    res.redirect('/suppliers');
  } catch (err) {
    console.error('Error deleting supplier:', err);
    res.status(500).send('Error deleting supplier');
  }
});

export default router;
