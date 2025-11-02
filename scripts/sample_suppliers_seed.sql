-- Sample suppliers seed script for Supabase/Postgres
-- Run this in the Supabase SQL editor to populate test suppliers.

BEGIN;

INSERT INTO suppliers (supplier_name, contact_person, mobile, email, address) VALUES
('Fresh Farms Ltd', 'Rajesh Kumar', '9876543210', 'rajesh@freshfarms.com', '123 Agriculture Road, Delhi'),
('Global Foods Inc', 'Priya Sharma', '8765432109', 'priya@globalfoods.in', '456 Industrial Area, Mumbai'),
('Quality Dairy Co', 'Amit Singh', '7654321098', 'amit@qualitydairy.com', '789 Dairy Lane, Punjab'),
('Organic Produce Hub', 'Sneha Patel', '6543210987', 'sneha@organichub.in', '321 Green Valley, Gujarat'),
('Premium Beverages', 'Vikram Joshi', '5432109876', 'vikram@premiumbev.com', '654 Beverage Street, Karnataka');

COMMIT;

-- Verify insertion
SELECT supplier_id, supplier_name, contact_person, mobile, email, is_active FROM suppliers ORDER BY supplier_id;
