import { supabase } from '../db/pool.js';

async function initSupabase() {
  try {
    console.log('Checking Supabase tables and data...');

    // Check if tables have data
    const tables = ['employees', 'departments', 'products', 'suppliers', 'customers', 'sales_invoices'];

    let hasData = false;
    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          console.log(`Error checking table '${table}':`, error.message);
        } else {
          console.log(`Table '${table}' has ${count} records`);
          if (count > 0) hasData = true;
        }
      } catch (err) {
        console.log(`Error checking table '${table}':`, err.message);
      }
    }

    if (!hasData) {
      console.log('No data found. Inserting sample data...');

      // Insert sample departments
      const { error: deptError } = await supabase.from('departments').insert([
        { dep_name: 'Personal care', supervisor_id: 1, start_date: '2023-01-15' },
        { dep_name: 'Home care', supervisor_id: 2, start_date: '2022-11-01' },
        { dep_name: 'Oil, Sugar & Masalas', supervisor_id: 3, start_date: '2024-03-20' },
        { dep_name: 'Rice, Atta & Dals', supervisor_id: 4, start_date: '2023-06-10' },
        { dep_name: 'Packaged Foods & Dry Fruits', supervisor_id: 5, start_date: '2021-09-01' },
        { dep_name: 'Beverages', supervisor_id: 6, start_date: '2022-05-14' },
        { dep_name: 'Dairy, Fresh & Frozen', supervisor_id: 7, start_date: '2023-10-01' },
        { dep_name: 'Restaurant Supplies & Houseware', supervisor_id: 8, start_date: '2020-12-12' },
        { dep_name: 'IT, Stationery & Office Furniture', supervisor_id: 9, start_date: '2024-01-05' },
        { dep_name: 'Luggage & Apparel', supervisor_id: 10, start_date: '2023-02-25' },
        { dep_name: 'Health & OTC', supervisor_id: 11, start_date: '2019-07-19' },
        { dep_name: 'Kitchen & Home Appliances', supervisor_id: 12, start_date: '2024-04-01' }
      ]);
      if (deptError) console.error('Error inserting departments:', deptError);

      // Insert sample employees
      const { error: empError } = await supabase.from('employees').insert([
        { emp_name: 'Amit Sharma', email: 'amit.sharma@gmail.com', mobile: '9876543210', salary: 25000.00, hire_date: '2023-01-15', is_active: true },
        { emp_name: 'Priya Verma', email: 'priya.verma@gmail.com', mobile: '9123456780', salary: 28500.50, hire_date: '2022-11-01', is_active: true },
        { emp_name: 'Rahul Mehta', email: 'rahul.mehta@gmail.com', mobile: '9988776655', salary: 29500.00, hire_date: '2024-03-20', is_active: true },
        { emp_name: 'Sneha Kapoor', email: 'sneha.kapoor@gmail.com', mobile: '9090909090', salary: 27000.75, hire_date: '2023-06-10', is_active: true },
        { emp_name: 'Vikas Singh', email: 'vikas.singh@gmail.com', mobile: '9012345678', salary: 26000.00, hire_date: '2021-09-01', is_active: true }
      ]);
      if (empError) console.error('Error inserting employees:', empError);

      // Insert sample products
      const { error: prodError } = await supabase.from('products').insert([
        { product_code: 'PC001', product_name: 'Herbal Shampoo', price: 220.00, stock: 150, reorder_level: 20, dep_num: 1, is_active: true },
        { product_code: 'PC002', product_name: 'Body Lotion', price: 180.50, stock: 80, reorder_level: 15, dep_num: 1, is_active: true },
        { product_code: 'HC003', product_name: 'Dishwashing Liquid', price: 90.00, stock: 200, reorder_level: 25, dep_num: 2, is_active: true },
        { product_code: 'OS005', product_name: 'Refined Sugar 1kg', price: 45.00, stock: 500, reorder_level: 50, dep_num: 3, is_active: true },
        { product_code: 'RA006', product_name: 'Basmati Rice 5kg', price: 650.00, stock: 75, reorder_level: 10, dep_num: 4, is_active: true }
      ]);
      if (prodError) console.error('Error inserting products:', prodError);

      // Insert sample customers
      const { error: custError } = await supabase.from('customers').insert([
        { customer_name: 'Arjun Reddy', mobile: '9000000001', email: 'arjun.reddy@gmail.com', address: 'Indore', loyalty_points: 120 },
        { customer_name: 'Simran Kaur', mobile: '9000000002', email: 'simran.kaur@gmail.com', address: 'Indore', loyalty_points: 80 },
        { customer_name: 'Ravi Kumar', mobile: '9000000003', email: 'ravi.kumar@gmail.com', address: 'Indore', loyalty_points: 200 }
      ]);
      if (custError) console.error('Error inserting customers:', custError);

      // Insert sample suppliers
      const { error: suppError } = await supabase.from('suppliers').insert([
        { supplier_name: 'FreshCare Pvt Ltd', contact_person: 'Rohit Sinha', mobile: '9876543001', email: 'rohit@freshcare.com', address: 'Mumbai, MH', is_active: true },
        { supplier_name: 'HomeBright Ltd', contact_person: 'Meena Patel', mobile: '9876543002', email: 'meena@homebright.com', address: 'Delhi, DL', is_active: true }
      ]);
      if (suppError) console.error('Error inserting suppliers:', suppError);

      // Insert sample sales
      const { error: salesError } = await supabase.from('sales_invoices').insert([
        { customer_id: 1, emp_id: 1, sub_total: 1500.00, discount_applied: 50.00, tax_amount: 75.00 },
        { customer_id: 2, emp_id: 2, sub_total: 2000.00, discount_applied: 100.00, tax_amount: 90.00 },
        { emp_id: 3, sub_total: 1800.00, discount_applied: 0.00, tax_amount: 81.00 }
      ]);
      if (salesError) console.error('Error inserting sales:', salesError);

      // Insert sample sales details
      const { error: detailsError } = await supabase.from('sales_details').insert([
        { invoice_num: 1, product_code: 'PC001', quantity: 3, selling_price: 230.00 },
        { invoice_num: 1, product_code: 'PC002', quantity: 2, selling_price: 185.00 },
        { invoice_num: 2, product_code: 'HC003', quantity: 5, selling_price: 95.00 },
        { invoice_num: 3, product_code: 'OS005', quantity: 10, selling_price: 50.00 }
      ]);
      if (detailsError) console.error('Error inserting sales details:', detailsError);

      console.log('✅ Sample data inserted!');
    } else {
      console.log('Database already has data.');
    }

  } catch (error) {
    console.error('❌ Supabase initialization failed:', error);
  } finally {
    process.exit();
  }
}

initSupabase();
