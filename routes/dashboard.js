import express from 'express';
import pool, { supabase } from '../db/pool.js';

const router = express.Router();

const supabaseAvailable = Boolean(supabase);

// Dashboard route
router.get('/', async (req, res) => {
  try {
    let dashboardData = {};

    // Try Postgres first
    try {
      // Get total sales and revenue
      const salesResult = await pool.query(`
        SELECT
          COUNT(DISTINCT si.invoice_num) as total_invoices,
          COALESCE(SUM(si.final_amount), 0) as total_revenue,
          COALESCE(AVG(si.final_amount), 0) as avg_ticket,
          COUNT(DISTINCT si.customer_id) as total_customers_served
        FROM sales_invoices si
        WHERE si.invoice_timestamp >= CURRENT_DATE - INTERVAL '30 days'
      `);

      // Get total products and active products
      const productsResult = await pool.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_products
        FROM products
      `);

      // Get total customers
      const customersResult = await pool.query(`
        SELECT COUNT(*) as total_customers
        FROM customers
      `);

      // Get total suppliers
      const suppliersResult = await pool.query(`
        SELECT COUNT(*) as total_suppliers
        FROM suppliers
      `);

      // Get recent sales (last 10)
      const recentSalesResult = await pool.query(`
        SELECT
          si.invoice_num,
          si.invoice_timestamp,
          si.final_amount,
          COALESCE(c.customer_name, 'Walk-in Customer') as customer_name,
          e.emp_name,
          COUNT(sd.product_code) as items_count
        FROM sales_invoices si
        LEFT JOIN customers c ON c.customer_id = si.customer_id
        JOIN employees e ON e.emp_id = si.emp_id
        LEFT JOIN sales_details sd ON sd.invoice_num = si.invoice_num
        GROUP BY si.invoice_num, si.invoice_timestamp, si.final_amount, c.customer_name, e.emp_name
        ORDER BY si.invoice_timestamp DESC
        LIMIT 10
      `);

      // Get top products by revenue
      const topProductsResult = await pool.query(`
        SELECT
          p.product_name,
          SUM(sd.total) as revenue,
          SUM(sd.quantity) as units_sold
        FROM sales_details sd
        JOIN products p ON p.product_code = sd.product_code
        GROUP BY p.product_code, p.product_name
        ORDER BY revenue DESC
        LIMIT 5
      `);

      // Get sales by day for the last 7 days
      const salesTrendResult = await pool.query(`
        SELECT
          DATE(si.invoice_timestamp) as date,
          COUNT(*) as invoices,
          SUM(si.final_amount) as revenue
        FROM sales_invoices si
        WHERE si.invoice_timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(si.invoice_timestamp)
        ORDER BY date
      `);

      dashboardData = {
        totalRevenue: Number(salesResult.rows[0].total_revenue) || 0,
        totalInvoices: Number(salesResult.rows[0].total_invoices) || 0,
        avgTicket: Number(salesResult.rows[0].avg_ticket) || 0,
        totalCustomersServed: Number(salesResult.rows[0].total_customers_served) || 0,
        totalProducts: Number(productsResult.rows[0].total_products) || 0,
        activeProducts: Number(productsResult.rows[0].active_products) || 0,
        totalCustomers: Number(customersResult.rows[0].total_customers) || 0,
        totalSuppliers: Number(suppliersResult.rows[0].total_suppliers) || 0,
        recentSales: recentSalesResult.rows.map(row => ({
          invoice_num: row.invoice_num,
          invoice_timestamp: row.invoice_timestamp,
          final_amount: Number(row.final_amount) || 0,
          customer_name: row.customer_name,
          emp_name: row.emp_name,
          items_count: Number(row.items_count) || 0
        })),
        topProducts: topProductsResult.rows.map(row => ({
          product_name: row.product_name,
          revenue: Number(row.revenue) || 0,
          units_sold: Number(row.units_sold) || 0
        })),
        salesTrend: salesTrendResult.rows.map(row => ({
          date: row.date,
          invoices: Number(row.invoices) || 0,
          revenue: Number(row.revenue) || 0
        }))
      };

    } catch (pgErr) {
      console.error('Error loading dashboard from Postgres:', pgErr);
    }

    // Fallback to Supabase if no data from Postgres
    if (!dashboardData.totalRevenue && supabaseAvailable) {
      try {
        // Similar queries for Supabase would go here
        // For now, we'll use placeholder data
        dashboardData = {
          totalRevenue: 0,
          totalInvoices: 0,
          avgTicket: 0,
          totalCustomersServed: 0,
          totalProducts: 0,
          activeProducts: 0,
          totalCustomers: 0,
          totalSuppliers: 0,
          recentSales: [],
          topProducts: [],
          salesTrend: []
        };
      } catch (supErr) {
        console.error('Error loading dashboard from Supabase:', supErr);
      }
    }

    // Format data for display
    dashboardData.formattedRevenue = `₹${dashboardData.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    dashboardData.formattedAvgTicket = `₹${dashboardData.avgTicket.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    dashboardData.lastUpdated = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    res.render('dashboard', dashboardData);
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

export default router;
