import express from 'express';
import pool, { supabase } from '../db/pool.js';

const router = express.Router();

const supabaseAvailable = Boolean(supabase);
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

const createEmptySummary = () => ({
  totalInvoices: 0,
  totalUnits: 0,
  totalGross: 0,
  totalDiscount: 0,
  totalTax: 0,
  totalNet: 0,
  avgTicket: 0
});

const computeSummary = (invoices) => {
  const summary = createEmptySummary();
  summary.totalInvoices = invoices.length;

  for (const inv of invoices) {
    summary.totalUnits += Number(inv.total_items) || 0;
    summary.totalGross += Number(inv.sub_total) || 0;
    summary.totalDiscount += Number(inv.discount_applied) || 0;
    summary.totalTax += Number(inv.tax_amount) || 0;
    summary.totalNet += Number(inv.final_amount) || 0;
  }

  summary.totalGross = Number(summary.totalGross.toFixed(2));
  summary.totalDiscount = Number(summary.totalDiscount.toFixed(2));
  summary.totalTax = Number(summary.totalTax.toFixed(2));
  summary.totalNet = Number(summary.totalNet.toFixed(2));
  summary.avgTicket = summary.totalInvoices ? Number((summary.totalNet / summary.totalInvoices).toFixed(2)) : 0;

  return summary;
};

const startOfDayIso = (date) => `${date}T00:00:00`;
const endOfDayIso = (date) => `${date}T23:59:59.999`;

const mapPgInvoiceRow = (row) => {
  const subTotal = Number(row.sub_total) || 0;
  const discount = Number(row.discount_applied) || 0;
  const tax = Number(row.tax_amount) || 0;
  const finalAmount = Number(row.final_amount) || Number((subTotal - discount + tax).toFixed(2));
  const totalItems = Number(row.total_items) || 0;

  return {
    invoice_num: row.invoice_num,
    invoice_timestamp: row.invoice_timestamp,
    sub_total: subTotal,
    discount_applied: discount,
    tax_amount: tax,
    final_amount: finalAmount,
    customer_name: row.customer_name || 'Walk-in Customer',
    emp_name: row.emp_name,
    total_items: totalItems
  };
};

const loadSalesFromPg = async (filters) => {
  try {
    const { startDate, endDate, customer_id, emp_id } = filters;

    const clauses = [];
    const params = [];

    if (startDate) {
      clauses.push(`si.invoice_timestamp::date >= $${params.length + 1}`);
      params.push(startDate);
    }
    if (endDate) {
      clauses.push(`si.invoice_timestamp::date <= $${params.length + 1}`);
      params.push(endDate);
    }
    if (customer_id) {
      clauses.push(`si.customer_id = $${params.length + 1}`);
      params.push(customer_id);
    }
    if (emp_id) {
      clauses.push(`si.emp_id = $${params.length + 1}`);
      params.push(emp_id);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const invoicesSql = `
      SELECT si.invoice_num,
             si.invoice_timestamp,
             si.sub_total,
             si.discount_applied,
             si.tax_amount,
             si.final_amount,
             COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
             e.emp_name,
             COALESCE(SUM(sd.quantity), 0) AS total_items
      FROM sales_invoices si
      LEFT JOIN customers c ON c.customer_id = si.customer_id
      JOIN employees e ON e.emp_id = si.emp_id
      LEFT JOIN sales_details sd ON sd.invoice_num = si.invoice_num
      ${where}
      GROUP BY si.invoice_num, c.customer_name, e.emp_name
      ORDER BY si.invoice_timestamp DESC
      LIMIT 100
    `;
    const { rows: invoiceRows } = await pool.query(invoicesSql, params);

    const invoices = (invoiceRows || []).map(mapPgInvoiceRow);
    const summary = computeSummary(invoices);

    const [customerResult, employeeResult, topProductsResult] = await Promise.all([
      pool.query('SELECT customer_id, customer_name FROM customers ORDER BY customer_name ASC'),
      pool.query('SELECT emp_id, emp_name FROM employees ORDER BY emp_name ASC'),
      pool.query(
        `
          SELECT sd.product_code,
                 p.product_name,
                 SUM(sd.quantity) AS units_sold,
                 SUM(sd.total) AS revenue
          FROM sales_details sd
          JOIN products p ON p.product_code = sd.product_code
          GROUP BY sd.product_code, p.product_name
          ORDER BY revenue DESC
          LIMIT 5
        `
      )
    ]);

    const customers = customerResult.rows || [];
    const employees = employeeResult.rows || [];
    const topProducts = (topProductsResult.rows || []).map((row) => ({
      product_code: row.product_code,
      product_name: row.product_name,
      units_sold: Number(row.units_sold) || 0,
      revenue: Number(row.revenue) || 0
    }));

    return { invoices, summary, customers, employees, topProducts };
  } catch (err) {
    console.error('Error loading sales via Postgres:', err && (err.stack || err.message || err));
    return null;
  }
};

const loadSalesFromSupabase = async (filters) => {
  if (!supabaseAvailable) return null;

  try {
    const { startDate, endDate, customer_id, emp_id } = filters;

    let query = supabase
      .from('sales_invoices')
      .select(
        `
          invoice_num,
          invoice_timestamp,
          sub_total,
          discount_applied,
          tax_amount,
          final_amount,
          loyalty_points_earned,
          customer_id,
          emp_id,
          customers ( customer_name ),
          employees ( emp_name ),
          sales_details ( quantity )
        `
      )
      .order('invoice_timestamp', { ascending: false })
      .limit(100);

    if (startDate) {
      query = query.gte('invoice_timestamp', startOfDayIso(startDate));
    }
    if (endDate) {
      query = query.lte('invoice_timestamp', endOfDayIso(endDate));
       }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    if (emp_id) {
      query = query.eq('emp_id', emp_id);
    }

    const { data: invoiceData, error: invoiceError } = await query;
    if (invoiceError) throw invoiceError;

    const invoices = (invoiceData || []).map((row) => {
      const subTotal = Number(row.sub_total) || 0;
      const discount = Number(row.discount_applied) || 0;
      const tax = Number(row.tax_amount) || 0;
      const finalAmount = Number(row.final_amount) || Number((subTotal - discount + tax).toFixed(2));
      const totalItems = (row.sales_details || []).reduce(
        (sum, detail) => sum + (Number(detail.quantity) || 0),
        0
      );

      return {
        invoice_num: row.invoice_num,
        invoice_timestamp: row.invoice_timestamp,
        sub_total: subTotal,
        discount_applied: discount,
        tax_amount: tax,
        final_amount: finalAmount,
        customer_name: row.customers?.customer_name || 'Walk-in Customer',
        emp_name: row.employees?.emp_name || 'Unknown',
        total_items: totalItems
      };
    });

    const summary = computeSummary(invoices);

    const [customerRes, employeeRes, detailRes] = await Promise.all([
      supabase.from('customers').select('customer_id, customer_name').order('customer_name', { ascending: true }),
      supabase.from('employees').select('emp_id, emp_name').order('emp_name', { ascending: true }),
      supabase
        .from('sales_details')
        .select('product_code, quantity, total, products ( product_name )')
        .limit(1000)
    ]);

    if (customerRes.error) throw customerRes.error;
    if (employeeRes.error) throw employeeRes.error;
    if (detailRes.error) throw detailRes.error;

    const customers = customerRes.data || [];
    const employees = employeeRes.data || [];

    const productMap = new Map();
    for (const detail of detailRes.data || []) {
      const code = detail.product_code;
      if (!code) continue;

      if (!productMap.has(code)) {
        productMap.set(code, {
          product_code: code,
          product_name: detail.products?.product_name || code,
          units_sold: 0,
          revenue: 0
        });
      }
      const entry = productMap.get(code);
      entry.units_sold += Number(detail.quantity) || 0;
      entry.revenue += Number(detail.total) || 0;
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { invoices, summary, customers, employees, topProducts };
  } catch (err) {
    console.error('Error loading sales via Supabase:', err && (err.stack || err.message || err));
    return null;
  }
};

const loadNewFormFromPg = async () => {
  try {
    const [customerResult, employeeResult, productResult] = await Promise.all([
      pool.query('SELECT customer_id, customer_name FROM customers ORDER BY customer_name ASC'),
      pool.query('SELECT emp_id, emp_name FROM employees WHERE is_active = true ORDER BY emp_name ASC'),
      pool.query('SELECT product_code, product_name, price, stock FROM products WHERE is_active = true ORDER BY product_name ASC')
    ]);

    const customers = customerResult.rows || [];
    const employees = employeeResult.rows || [];
    const products = (productResult.rows || []).map((row) => ({
      ...row,
      price: Number(row.price) || 0,
      stock: Number(row.stock) || 0
    }));

    return { customers, employees, products };
  } catch (err) {
    console.error('Error loading new sale form via Postgres:', err && (err.stack || err.message || err));
    return null;
  }
};

const loadNewFormFromSupabase = async () => {
  if (!supabaseAvailable) return null;

  try {
    const [customerRes, employeeRes, productRes] = await Promise.all([
      supabase.from('customers').select('customer_id, customer_name').order('customer_name', { ascending: true }),
      supabase.from('employees').select('emp_id, emp_name').eq('is_active', true).order('emp_name', { ascending: true }),
      supabase
        .from('products')
        .select('product_code, product_name, price, stock')
        .eq('is_active', true)
        .order('product_name', { ascending: true })
    ]);

    if (customerRes.error) throw customerRes.error;
    if (employeeRes.error) throw employeeRes.error;
    if (productRes.error) throw productRes.error;

    const customers = customerRes.data || [];
    const employees = employeeRes.data || [];
    const products = (productRes.data || []).map((row) => ({
      ...row,
      price: Number(row.price) || 0,
      stock: Number(row.stock) || 0
    }));

    return { customers, employees, products };
  } catch (err) {
    console.error('Error loading new sale form via Supabase:', err && (err.stack || err.message || err));
    return null;
  }
};

const loadInvoiceFromPg = async (invoiceId) => {
  try {
    const headerSql = `
      SELECT si.invoice_num,
             si.invoice_timestamp,
             si.sub_total,
             si.discount_applied,
             si.tax_amount,
             si.final_amount,
             si.loyalty_points_earned,
             COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
             c.email AS customer_email,
             c.mobile AS customer_mobile,
             e.emp_name
      FROM sales_invoices si
      LEFT JOIN customers c ON c.customer_id = si.customer_id
      JOIN employees e ON e.emp_id = si.emp_id
      WHERE si.invoice_num = $1
    `;
    const { rows: headerRows } = await pool.query(headerSql, [invoiceId]);
    if (!headerRows.length) {
      return null;
    }
    const hdr = headerRows[0];
    const invoice = {
      invoice_num: hdr.invoice_num,
      invoice_timestamp: hdr.invoice_timestamp,
      sub_total: Number(hdr.sub_total) || 0,
      discount_applied: Number(hdr.discount_applied) || 0,
      tax_amount: Number(hdr.tax_amount) || 0,
      final_amount: Number(hdr.final_amount) || 0,
      loyalty_points_earned: Number(hdr.loyalty_points_earned) || 0,
      customer_name: hdr.customer_name,
      customer_email: hdr.customer_email,
      customer_mobile: hdr.customer_mobile,
      emp_name: hdr.emp_name
    };

    const detailsSql = `
      SELECT sd.product_code,
             p.product_name,
             sd.quantity,
             sd.selling_price,
             sd.total
      FROM sales_details sd
      JOIN products p ON p.product_code = sd.product_code
      WHERE sd.invoice_num = $1
    `;
    const { rows: detailRows } = await pool.query(detailsSql, [invoiceId]);
    const items = (detailRows || []).map((row) => ({
      product_code: row.product_code,
      product_name: row.product_name,
      quantity: Number(row.quantity) || 0,
      selling_price: Number(row.selling_price) || 0,
      total: Number(row.total) || 0
    }));

    return { invoice, items };
  } catch (err) {
    console.error('Error fetching invoice via Postgres:', err && (err.stack || err.message || err));
    return null;
  }
};

const loadInvoiceFromSupabase = async (invoiceId) => {
  if (!supabaseAvailable) return null;

  try {
    const { data, error } = await supabase
      .from('sales_invoices')
      .select(
        `
          invoice_num,
          invoice_timestamp,
          sub_total,
          discount_applied,
          tax_amount,
          final_amount,
          loyalty_points_earned,
          customers ( customer_name, email, mobile ),
          employees ( emp_name ),
          sales_details (
            product_code,
            quantity,
            selling_price,
            total,
            products ( product_name )
          )
        `
      )
      .eq('invoice_num', invoiceId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const invoice = {
      invoice_num: data.invoice_num,
      invoice_timestamp: data.invoice_timestamp,
      sub_total: Number(data.sub_total) || 0,
      discount_applied: Number(data.discount_applied) || 0,
      tax_amount: Number(data.tax_amount) || 0,
      final_amount: Number(data.final_amount) || 0,
      loyalty_points_earned: Number(data.loyalty_points_earned) || 0,
      customer_name: data.customers?.customer_name || 'Walk-in Customer',
      customer_email: data.customers?.email || null,
      customer_mobile: data.customers?.mobile || null,
      emp_name: data.employees?.emp_name || 'Unknown'
    };

    const items = (data.sales_details || []).map((detail) => ({
      product_code: detail.product_code,
      product_name: detail.products?.product_name || detail.product_code,
      quantity: Number(detail.quantity) || 0,
      selling_price: Number(detail.selling_price) || 0,
      total:
        Number(detail.total) ||
        Number(((Number(detail.quantity) || 0) * (Number(detail.selling_price) || 0)).toFixed(2))
    }));

    return { invoice, items };
  } catch (err) {
    console.error('Error fetching invoice via Supabase:', err && (err.stack || err.message || err));
    return null;
  }
};

router.get('/', async (req, res) => {
  const { startDate = '', endDate = '', customer_id = '', emp_id = '' } = req.query;
  const filters = { startDate, endDate, customer_id, emp_id };

  try {
    let payload = await loadSalesFromPg(filters);

    if ((!payload || !payload.invoices.length) && supabaseAvailable) {
      const supPayload = await loadSalesFromSupabase(filters);
      if (supPayload) {
        payload = supPayload;
      }
    }

    if (!payload) {
      return res.status(500).send('Error loading sales');
    }

    res.render('sales', {
      invoices: payload.invoices,
      summary: payload.summary,
      customers: payload.customers,
      employees: payload.employees,
      topProducts: payload.topProducts,
      filters
    });
  } catch (err) {
    console.error('Error loading sales list:', err && (err.stack || err.message || err));
    res.status(500).send('Error loading sales');
  }
});

router.get('/new', async (req, res) => {
  try {
    let formData = await loadNewFormFromPg();

    if ((!formData || !formData.products.length) && supabaseAvailable) {
      const supForm = await loadNewFormFromSupabase();
      if (supForm) {
        formData = supForm;
      }
    }

    if (!formData) {
      return res.status(500).send('Error loading form');
    }

    res.render('sales/new', formData);
  } catch (err) {
    console.error('Error loading new sale form:', err && (err.stack || err.message || err));
    res.status(500).send('Error loading form');
  }
});

router.get('/api/products/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const { rows } = await pool.query(
      'SELECT product_code, product_name, price, stock FROM products WHERE product_code = $1',
      [code]
    );
    if (rows.length) {
      return res.json({
        product_code: rows[0].product_code,
        product_name: rows[0].product_name,
        price: Number(rows[0].price) || 0,
        stock: Number(rows[0].stock) || 0
      });
    }
  } catch (err) {
    console.error('Error fetching product via Postgres:', err && (err.stack || err.message || err));
  }

  if (supabaseAvailable) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('product_code, product_name, price, stock')
        .eq('product_code', code)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return res.json({
          product_code: data.product_code,
          product_name: data.product_name,
          price: Number(data.price) || 0,
          stock: Number(data.stock) || 0
        });
      }
    } catch (supErr) {
      console.error('Error fetching product via Supabase:', supErr && (supErr.stack || supErr.message || supErr));
    }
  }

  res.status(404).json({ error: 'Product not found' });
});

router.post('/', async (req, res) => {
  // Try to use PG pool + transaction. If connection fails (e.g. tenant/user error),
  // fall back to using the Supabase client to perform inserts.
  let client = null;
  let started = false;
  let usingPg = false;

  try {
    if (typeof pool.connect === 'function') {
      client = await pool.connect();
      usingPg = true;
    }
  } catch (connErr) {
    console.warn('PG pool.connect failed, will attempt Supabase fallback for sale creation:', connErr && (connErr.message || connErr));
    usingPg = false;
  }

  try {
    const { customer_id = '', emp_id, discount_applied = 0, tax_rate = 0 } = req.body;

    const productCodes = toArray(req.body.product_code);
    const quantities = toArray(req.body.quantity);
    const prices = toArray(req.body.selling_price);

    const items = productCodes
      .map((code, idx) => ({
        product_code: code,
        quantity: Number(quantities[idx]),
        price: Number(prices[idx])
      }))
      .filter((item) => item.product_code && item.quantity > 0 && item.price > 0);

    if (!emp_id) {
      return res.status(400).send('Select a salesperson');
    }

    if (!items.length) {
      return res.status(400).send('Add at least one line item');
    }

    const subTotal = Number(
      items.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2)
    );
    const discount = Math.max(0, Math.min(Number(discount_applied) || 0, subTotal));
    const baseForTax = subTotal - discount;
    const taxRate = Math.max(0, Number(tax_rate) || 0);
    const taxAmount = Number(
      (baseForTax > 0 ? (baseForTax * taxRate) / 100 : 0).toFixed(2)
    );

    if (usingPg) {
      await client.query('BEGIN');
      started = true;

      for (const item of items) {
        const { rows } = await client.query(
          'SELECT stock, product_name FROM products WHERE product_code = $1 FOR UPDATE',
          [item.product_code]
        );
        if (!rows.length) {
          throw new Error(`Product ${item.product_code} not found`);
        }
        const product = rows[0];
        if (Number(product.stock) < item.quantity) {
          throw new Error(`${product.product_name} has only ${product.stock} in stock`);
        }
      }

      const invoiceResult = await client.query(
        `INSERT INTO sales_invoices (customer_id, emp_id, sub_total, discount_applied, tax_amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING invoice_num`,
        [
          customer_id ? Number(customer_id) : null,
          Number(emp_id),
          subTotal,
          discount,
          taxAmount
        ]
      );
      const invoiceNum = invoiceResult.rows[0].invoice_num;

      const detailInsert = `
        INSERT INTO sales_details (invoice_num, product_code, quantity, selling_price)
        VALUES ($1, $2, $3, $4)
      `;
      for (const item of items) {
        await client.query(detailInsert, [
          invoiceNum,
          item.product_code,
          item.quantity,
          item.price
        ]);
      }

      await client.query('COMMIT');
      return res.redirect(`/sales/${invoiceNum}`);
    }

    // If PG isn't available, use Supabase client as fallback (not fully transactional).
    if (!supabaseAvailable) {
      return res.status(503).send('Sales creation requires Postgres or Supabase client.');
    }

    // Validate stock via Supabase
    for (const item of items) {
      const { data: prod, error: pErr } = await supabase.from('products').select('stock, product_name').eq('product_code', item.product_code).maybeSingle();
      if (pErr) throw pErr;
      if (!prod) throw new Error(`Product ${item.product_code} not found`);
      if (Number(prod.stock) < item.quantity) throw new Error(`${prod.product_name} has only ${prod.stock} in stock`);
    }

    // Insert invoice via Supabase and return inserted invoice (invoice_num)
    const { data: insertedInvoice, error: invErr } = await supabase
      .from('sales_invoices')
      .insert([
        {
          customer_id: customer_id ? Number(customer_id) : null,
          emp_id: Number(emp_id),
          sub_total: subTotal,
          discount_applied: discount,
          tax_amount: taxAmount
        }
      ])
      .select('invoice_num')
      .maybeSingle();

    if (invErr) throw invErr;
    const invoiceNum = insertedInvoice?.invoice_num;
    if (!invoiceNum) throw new Error('Failed to create invoice via Supabase');

    // Insert details
    for (const item of items) {
      const { error: dErr } = await supabase.from('sales_details').insert([
        { invoice_num: invoiceNum, product_code: item.product_code, quantity: item.quantity, selling_price: item.price }
      ]);
      if (dErr) throw dErr;
    }

    return res.redirect(`/sales/${invoiceNum}`);
  } catch (err) {
    if (started) {
      try { await client.query('ROLLBACK'); } catch(_){}
    }
    console.error('Error creating sale:', err && (err.stack || err.message || err));
    res
      .status(err.message && err.message.includes('stock') ? 400 : 500)
      .send(err.message || 'Error creating sale');
  } finally {
    if (client && typeof client.release === 'function') try { client.release(); } catch(_){}
  }
});

router.get("/report", async (req, res) => {
  try {
    const { last_n = "", month = "", year = "" } = req.query;

    let query = supabase
      .from("sales_invoices")
      .select(`
        invoice_num,
        invoice_timestamp,
        sub_total,
        discount_applied,
        tax_amount,
        final_amount,
        customers ( customer_name ),
        employees ( emp_name )
      `)
      .order("invoice_timestamp", { ascending: false });

    // MONTH WISE REPORT FILTER
    if (month && year) {
      const yy = year;
      const mm = String(month).padStart(2, "0");

      // last date auto calculate
      const lastDay = new Date(yy, month, 0).getDate();

      query = query
        .gte("invoice_timestamp", `${yy}-${mm}-01`)
        .lte("invoice_timestamp", `${yy}-${mm}-${lastDay}`);
    }

    // LAST N INVOICES FILTER
    if (last_n) {
      query = query.limit(parseInt(last_n));
    }

    const { data: invoices, error } = await query;
    if (error) throw error;

    // Convert Supabase structure
    const formatted = invoices.map(r => ({
      invoice_num: r.invoice_num,
      invoice_timestamp: r.invoice_timestamp,
      customer_name: r.customers?.customer_name || "Walk-in Customer",
      emp_name: r.employees?.emp_name || "Unknown",
      sub_total: r.sub_total,
      discount_applied: r.discount_applied,
      tax_amount: r.tax_amount,
      final_amount: r.final_amount
    }));

    // If empty → return empty CSV
    if (formatted.length === 0) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=sales_report.csv");
      return res.send("No Data Found\n");
    }

    // Create CSV manually
    const csvHeader =
      "Invoice,Date,Customer,Sold By,Subtotal,Discount,Tax,Total\n";

    const csvRows = formatted
      .map(inv =>
        [
          inv.invoice_num,
          new Date(inv.invoice_timestamp).toISOString(),
          inv.customer_name,
          inv.emp_name,
          inv.sub_total,
          inv.discount_applied,
          inv.tax_amount,
          inv.final_amount
        ].join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=sales_report.csv");

    return res.send(csvHeader + csvRows);
  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).send("Could not generate report");
  }
});




router.get('/:invoice_num', async (req, res) => {
  const invoiceId = Number(req.params.invoice_num);
  if (!invoiceId) {
    return res.status(404).send('Invoice not found');
  }

  try {
    let payload = await loadInvoiceFromPg(invoiceId);

    if ((!payload || !payload.invoice) && supabaseAvailable) {
      const supPayload = await loadInvoiceFromSupabase(invoiceId);
      if (supPayload) {
        payload = supPayload;
      }
    }

    if (!payload || !payload.invoice) {
      return res.status(404).send('Invoice not found');
    }

    res.render('sales/show', payload);
  } catch (err) {
    console.error('Error fetching invoice:', err && (err.stack || err.message || err));
    res.status(500).send('Error fetching invoice');
  }
});
export default router;
