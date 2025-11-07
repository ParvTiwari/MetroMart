INSERT INTO employees
(emp_name, email, mobile, salary, hire_date, is_active)
VALUES
('Amit Sharma', 'amit.sharma@gmail.com', '9876543210', 25000.00, '2023-01-15', true),
('Priya Verma', 'priya.verma@gmail.com', '9123456780', 28500.50, '2022-11-01', true),
('Rahul Mehta', 'rahul.mehta@gmail.com', '9988776655', 29500.00, '2024-03-20', true),
('Sneha Kapoor', 'sneha.kapoor@gmail.com', '9090909090', 27000.75, '2023-06-10', true),
('Vikas Singh', 'vikas.singh@gmail.com', '9012345678', 26000.00, '2021-09-01', true),
('Anjali Rao', 'anjali.rao@gmail.com', '9345678901', 22000.25, '2022-05-14', true),
('Rohit Jain', 'rohit.jain@gmail.com', '9456123789', 28000.00, '2023-10-01', true),
('Meena Kumari', 'meena.kumari@gmail.com', '9786452310', 29000.00, '2020-12-12', true),
('Sanjay Patel', 'sanjay.patel@gmail.com', '9234567810', 24000.00, '2024-01-05', true),
('Kavita Joshi', 'kavita.joshi@gmail.com', '9876123450', 23000.00, '2023-02-25', true),
('Deepak Yadav', 'deepak.yadav@gmail.com', '9123098765', 27500.00, '2019-07-19', true),
('Neha Gupta', 'neha.gupta@gmail.com', '9345098761', 29000.90, '2024-04-01', true);

insert into department
(dep_name, supervisor_id, start_date)
values
('Personal care', 1, '2023-01-15'),
('Home care', 2, '2022-11-01'),
('Oil, Sugar & Masalas', 3, '2024-03-20'),
('Rice, Atta & Dals', 4, '2023-06-10'),
('Packaged Foods & Dry Fruits', 5, '2021-09-01'),
('Beverages', 6, '2022-05-14'),
('Dairy, Fresh & Frozen', 7, '2023-10-01'),
('Restaurant Supplies & Houseware', 8, '2020-12-12'),
('IT, Stationery & Office Furniture', 9, '2024-01-05'),
('Luggage & Apparel', 10, '2023-02-25'),
('Health & OTC', 11, '2019-07-19'),
('Kitchen & Home Appliances', 12, '2024-04-01');

INSERT INTO products
(product_code, product_name, price, stock, reorder_level, dep_num, last_updated, is_active)
VALUES
('PC001', 'Herbal Shampoo', 220.00, 150, 20, 1, NOW(), true),
('PC002', 'Body Lotion', 180.50, 80, 15, 1, NOW(), true),
('HC003', 'Dishwashing Liquid', 90.00, 200, 25, 2, NOW(), true),
('HC004', 'Floor Cleaner Lemon', 150.00, 120, 30, 2, NOW(), true),
('OS005', 'Refined Sugar 1kg', 45.00, 500, 50, 3, NOW(), true),
('RA006', 'Basmati Rice 5kg', 650.00, 75, 10, 4, NOW(), true),
('PF007', 'Almonds 500g', 420.00, 40, 5, 5, NOW(), true),
('BV008', 'Instant Coffee 200g', 320.00, 60, 8, 6, NOW(), true),
('DA009', 'Cheddar Cheese 1kg', 480.00, 30, 5, 7, NOW(), true),
('RS010', 'Stainless Steel Spoon Set', 350.00, 100, 15, 8, NOW(), true);

INSERT INTO suppliers
(supplier_name, contact_person, mobile, email, address, registration_date, is_active)
VALUES
('FreshCare Pvt Ltd', 'Rohit Sinha', '9876543001', 'rohit@freshcare.com', 'Mumbai, MH', '2023-03-01', true),
('HomeBright Ltd', 'Meena Patel', '9876543002', 'meena@homebright.com', 'Delhi, DL', '2022-12-12', true),
('Golden Harvest Foods', 'Karan Mehta', '9876543003', 'karan@goldenharvest.com', 'Ahmedabad, GJ', '2024-04-05', true),
('Healthy Choice', 'Priya Singh', '9876543004', 'priya@healthychoice.com', 'Pune, MH', '2021-09-19', true),
('Daily Essentials', 'Vikas Jain', '9876543005', 'vikas@dailyessentials.com', 'Chennai, TN', '2020-10-10', true),
('NutriWorld', 'Asha Ram', '9876543006', 'asha@nutriworld.com', 'Bengaluru, KA', '2023-06-15', true),
('Aroma Beverages', 'Manish Gupta', '9876543007', 'manish@aromabv.com', 'Hyderabad, TS', '2022-02-02', true),
('CheeseMaster', 'Deepak Rao', '9876543008', 'deepak@cheesemaster.com', 'Kolkata, WB', '2024-01-12', true),
('SteelCraft', 'Neha Kapoor', '9876543009', 'neha@steelcraft.com', 'Jaipur, RJ', '2021-11-20', true),
('OrganicMart', 'Sanjay Patel', '9876543010', 'sanjay@organicmart.com', 'Lucknow, UP', '2023-07-09', true);

INSERT INTO supply_orders (supplier_id, order_date, total_amount)
VALUES
(1, '2024-01-15', 15000.00),
(2, '2024-01-18', 12000.00),
(3, '2024-02-01', 18000.00),
(4, '2024-02-10', 9500.00),
(5, '2024-02-12', 20500.00),
(6, '2024-02-15', 11200.00),
(7, '2024-03-01', 14000.00),
(8, '2024-03-05', 16000.00),
(9, '2024-03-10', 13300.00),
(10, '2024-03-12', 17500.00);

INSERT INTO supply_order_details (order_num, product_code, quantity, cost_price)
VALUES
(1, 'PC001', 100, 200.00),
(2, 'HC003', 150, 80.00),
(3, 'OS005', 300, 40.00),
(4, 'RA006', 50, 600.00),
(5, 'PF007', 40, 380.00),
(6, 'BV008', 60, 300.00),
(7, 'DA009', 30, 450.00),
(8, 'RS010', 75, 320.00),
(9, 'HC004', 120, 130.00),
(10, 'PC002', 90, 160.00);

INSERT INTO customers(customer_name, mobile, email, address, loyalty_points, registration_date)
VALUES
('Arjun Reddy', '9000000001', 'arjun.reddy@gmail.com', 'Indore', 120, '2023-05-01'),
('Simran Kaur', '9000000002', 'simran.kaur@gmail.com', 'Indore', 80, '2022-09-12'),
('Ravi Kumar', '9000000003', 'ravi.kumar@gmail.com', 'Indore', 200, '2024-01-03'),
('Pooja Sharma', '9000000004', 'pooja.sharma@gmail.com', 'Indore', 150, '2023-03-22'),
('Nitin Verma', '9000000005', 'nitin.verma@gmail.com', 'Indore', 95, '2021-11-30'),
('Aisha Khan', '9000000006', 'aisha.khan@gmail.com', 'Indore', 300, '2020-06-18'),
('Manoj Patil', '9000000007', 'manoj.patil@gmail.com', 'Indore', 50, '2024-02-10'),
('Sneha Roy', '9000000008', 'sneha.roy@gmail.com', 'Indore', 75, '2023-12-12'),
('Rahul Singh', '9000000009', 'rahul.singh@gmail.com', 'Indore', 30, '2023-07-09'),
('Deepa Joshi', '9000000010', 'deepa.joshi@gmail.com', 'Indore', 110, '2022-08-15');

INSERT INTO sales_invoices (customer_id, emp_id, invoice_timestamp, sub_total, discount_applied, tax_amount, loyalty_points_earned)
VALUES
(1, 1, '2024-03-15 10:30:00', 1500.00, 50.00, 75.00, 15),
(2, 2, '2024-03-16 12:00:00', 2000.00, 100.00, 90.00, 20),
(3, 3, '2024-03-17 14:20:00', 1800.00, 0.00, 81.00, 18),
(4, 4, '2024-03-18 16:45:00', 2500.00, 125.00, 112.50, 25),
(5, 5, '2024-03-19 10:15:00', 3200.00, 100.00, 144.00, 32),
(6, 6, '2024-03-20 11:50:00', 1750.00, 50.00, 78.75, 17),
(7, 7, '2024-03-21 09:30:00', 900.00, 0.00, 40.50, 9),
(8, 8, '2024-03-22 15:10:00', 2200.00, 110.00, 99.00, 22),
(9, 9, '2024-03-23 13:40:00', 1450.00, 50.00, 65.25, 14),
(10, 10, '2024-03-24 17:05:00', 2750.00, 150.00, 123.75, 27);

INSERT INTO sales_details (invoice_num, product_code, quantity, selling_price)
VALUES
(1, 'PC001', 3, 230.00),
(2, 'HC003', 5, 95.00),
(3, 'OS005', 10, 50.00),
(4, 'RA006', 2, 700.00),
(5, 'PF007', 1, 450.00),
(6, 'BV008', 3, 340.00),
(7, 'DA009', 1, 520.00),
(8, 'RS010', 4, 380.00),
(9, 'HC004', 2, 160.00),
(10, 'PC002', 3, 200.00);

INSERT INTO returns (invoice_num, product_code, quantity_returned, return_reason, return_date, refund_amount, process_emp_id)
VALUES
(1, 'PC001', 1, 'Damaged product', '2024-03-16', 230.00, 2),
(3, 'OS005', 2, 'Expired product', '2024-03-18', 100.00, 3),
(4, 'RA006', 1, 'Wrong item delivered', '2024-03-19', 700.00, 4),
(5, 'PF007', 1, 'Customer dissatisfaction', '2024-03-20', 450.00, 5),
(7, 'DA009', 1, 'Packaging issue', '2024-03-22', 520.00, 7);

insert into product_supplier (supplier_id, product_code, cost_price) VALUES
(1, 'PC001', 180.00), (2, 'PC001', 185.00), (3, 'PC001', 182.50),
(1, 'PC002', 150.00), (4, 'PC002', 155.00), (5, 'PC002', 153.00),
(3, 'HC003', 70.00), (6, 'HC003', 72.50), (7, 'HC003', 75.00),
(2, 'HC004', 120.00), (8, 'HC004', 118.00), (9, 'HC004', 119.50),
(4, 'OS005', 35.00), (1, 'OS005', 36.50), (10, 'OS005', 34.50),
(6, 'RA006', 550.00), (7, 'RA006', 560.00), (5, 'RA006', 545.00),
(9, 'PF007', 380.00), (3, 'PF007', 385.00), (8, 'PF007', 375.00),
(10, 'BV008', 270.00), (2, 'BV008', 265.00), (1, 'BV008', 275.00),
(7, 'DA009', 430.00), (4, 'DA009', 435.00), (6, 'DA009', 440.00),
(8, 'RS010', 300.00), (9, 'RS010', 310.00), (5, 'RS010', 295.00),
(2, 'PC001', 178.00), (4, 'HC003', 71.00), (3, 'RA006', 555.00),
(1, 'PF007', 382.00), (10, 'RS010', 298.00), (6, 'BV008', 268.00);