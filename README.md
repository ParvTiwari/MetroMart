# MetroMart

Metromart is an enterprise-grade supermarket management solution designed to streamline fast, reliable, and scalable handling of all major retail processes. This project emphasizes robust database architecture to ensure integrity, normalization, and efficient data operations for large-scale supermarket chains and hypermarkets.​

## Project Overview
MetroMart aims to provide features such as:

- Secure user authentication and profile management
- Comprehensive entity-relationship (ER) modeling for full retail workflows
- Multi-entity design for products, inventory, customers, suppliers, staff, sales, returns, and procurement
- Efficient query and transaction support for thousands of daily operations
- Data integrity and referential integrity through enforced foreign keys
- User-friendly shopping cart and seamless checkout process
- Comprehensive product catalog with categories and detailed information
- Efficient inventory management system

## Sales Seed Script

A ready-to-run Supabase/Postgres seeding script lives at `scripts/sample_sales_seed.sql`. To load sample invoices:

1. Ensure at least one employee and one active product exist (customers are optional).
2. Open the Supabase SQL editor and paste the file contents.
3. Execute the script; it inserts three invoices plus associated line items, automatically calculating totals.
4. (Optional) Run the commented `SELECT` at the bottom to inspect the newly inserted rows.

The script is idempotent per execution (it always creates fresh invoices) and keeps the logic lightweight while demonstrating end-to-end sales data.
