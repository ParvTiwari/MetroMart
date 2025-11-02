import express from 'express';
import pool, { supabase } from '../db/pool.js';

const router = express.Router();

// Dashboard route
router.get('/', async (req, res) => {
  try {
    let dashboardData = {};

    // Use Supabase for all queries
    if (supabase) {
      try {
        // Get total sales and revenue for last 30 days
        const { data: salesData, error: salesError } = await supabase
          .from('sales_invoices')
          .select('final_amount, customer_id')
          .gte('invoice_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (salesError) throw salesError;

        const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.final_amount || 0), 0);
        const totalInvoices = salesData.length;
        const avgTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
        const totalCustomersServed = new Set(salesData.map(sale => sale.customer_id).filter(id => id)).size;

        // Get total products and active products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('is_active');

        if (productsError) throw productsError;

        const totalProducts = productsData.length;
        const activeProducts = productsData.filter(p => p.is_active !== false).length;

        // Get total customers
        const { count: totalCustomers, error: customersError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true });

        if (customersError) throw customersError;

        // Get total suppliers
        const { count: totalSuppliers, error: suppliersError } = await supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true });

        if (suppliersError) throw suppliersError;

        // Get recent sales (last 10)
        const { data: recentSalesData, error: recentSalesError } = await supabase
          .from('sales_invoices')
          .select(`
            invoice_num,
            invoice_timestamp,
            final_amount,
            customers (customer_name),
            employees (emp_name),
            sales_details (product_code)
          `)
          .order('invoice_timestamp', { ascending: false })
          .limit(10);

        if (recentSalesError) throw recentSalesError;

        const recentSales = recentSalesData.map(sale => ({
          invoice_num: sale.invoice_num,
          invoice_timestamp: sale.invoice_timestamp,
          final_amount: sale.final_amount || 0,
          customer_name: sale.customers?.customer_name || 'Walk-in Customer',
          emp_name: sale.employees?.emp_name || 'Unknown',
          items_count: sale.sales_details?.length || 0
        }));

        // Get top products by revenue
        const { data: topProductsData, error: topProductsError } = await supabase
          .from('sales_details')
          .select(`
            quantity,
            total,
            products (product_name)
          `);

        if (topProductsError) throw topProductsError;

        const productRevenue = {};
        topProductsData.forEach(detail => {
          const productName = detail.products?.product_name;
          if (productName) {
            if (!productRevenue[productName]) {
              productRevenue[productName] = { revenue: 0, units: 0 };
            }
            productRevenue[productName].revenue += detail.total || 0;
            productRevenue[productName].units += detail.quantity || 0;
          }
        });

        const topProducts = Object.entries(productRevenue)
          .map(([name, data]) => ({ product_name: name, revenue: data.revenue, units_sold: data.units }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Get sales by day for the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { data: salesTrendData, error: salesTrendError } = await supabase
          .from('sales_invoices')
          .select('invoice_timestamp, final_amount')
          .gte('invoice_timestamp', sevenDaysAgo)
          .order('invoice_timestamp');

        if (salesTrendError) throw salesTrendError;

        const salesByDay = {};
        salesTrendData.forEach(sale => {
          const date = sale.invoice_timestamp.split('T')[0];
          if (!salesByDay[date]) {
            salesByDay[date] = { invoices: 0, revenue: 0 };
          }
          salesByDay[date].invoices++;
          salesByDay[date].revenue += sale.final_amount || 0;
        });

        const salesTrend = Object.entries(salesByDay)
          .map(([date, data]) => ({ date, invoices: data.invoices, revenue: data.revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));

        dashboardData = {
          totalRevenue,
          totalInvoices,
          avgTicket,
          totalCustomersServed,
          totalProducts,
          activeProducts,
          totalCustomers: totalCustomers || 0,
          totalSuppliers: totalSuppliers || 0,
          recentSales,
          topProducts,
          salesTrend
        };

      } catch (supErr) {
        console.error('Error loading dashboard from Supabase:', supErr);
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
      }
    } else {
      // No database connection
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
