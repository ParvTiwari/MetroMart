create table employees(
	emp_id serial primary key,
	emp_name varchar(50) not null,
	email varchar(75) not null unique,
	mobile char(10) not null unique,
	salary decimal(10, 2) not null check(salary > 0),
	hire_date date not null default current_date,
	is_active boolean default true
);

create table department(
	dep_id serial primary key,
	dep_name varchar(50) not null,
	supervisor_id int,
	start_date date default current_date,
	
	foreign key(supervisor_id) references employees(emp_id) on delete set null	
);

create table products(
	product_code varchar(25) primary key,
	product_name varchar(100) not null unique,
	price decimal(10, 2) not null check(price > 0),
	stock int not null default 0 check (stock >= 0),
	reorder_level int not null default 10 check (reorder_level > 0),
	dep_num int not null,
	last_updated timestamp default current_timestamp,
	is_active boolean default true,

	foreign key (dep_num) references department (dep_id) on delete restrict 
);

create table suppliers (
    supplier_id serial primary key,
    supplier_name varchar(100) not null,
    contact_person varchar(50) not null,
    mobile char(10) not null unique,
    email varchar(75) not null unique,
    address text not null,
    registration_date date default current_date,
    is_active boolean default true
);

create table supply_orders (
    order_num serial primary key,
    supplier_id int not null,
    order_date date not null default (current_date),
    total_amount decimal(12,2) default 0.00,

    foreign key (supplier_id) references suppliers(supplier_id) on delete restrict
);

create table supply_order_details (
    order_num int,
    product_code varchar(25),
    quantity int not null check (quantity > 0),
    cost_price decimal(10,2) not null check (cost_price > 0),
    total decimal(12,2) generated always as (quantity * cost_price) stored,

    primary key (order_num, product_code),
    foreign key (order_num) references supply_orders(order_num) on delete cascade,
    foreign key (product_code) references products(product_code) on delete restrict
);

create table product_supplier(
    supplier_id int,
    product_code varchar(25),
    cost_price DECIMAL(10,2) not null check (cost_price > 0),
    
    primary key (supplier_id, product_code),
    foreign key (product_code) references products(product_code) on delete cascade,
    foreign key (supplier_id) references suppliers(supplier_id) on delete cascade
);

create table customers (
    customer_id serial primary key,
    customer_name varchar(100) not null,
    mobile char(10) not null unique,
    email varchar(75) not null unique,
    address text not null,
    loyalty_points int default 0 check (loyalty_points >= 0),
    registration_date date default current_date
);

create table sales_invoices (
    invoice_num serial primary key,
    customer_id int,
    emp_id int not null,
    invoice_timestamp timestamp not null default current_timestamp,
    sub_total decimal(12,2) not null default 0.00,
    discount_applied decimal(10,2) default 0.00 check (discount_applied >= 0),
    tax_amount decimal(10,2) default 0.00,
    final_amount decimal(12,2) generated always as (sub_total - discount_applied + tax_amount) stored,
    loyalty_points_earned int default 0,

    foreign key (customer_id) references customers(customer_id) on delete set null,
    foreign key (emp_id) references employees(emp_id) on delete restrict
);

create table sales_details (
    invoice_num int,
    product_code varchar(25),
    quantity int not null check (quantity > 0),
    selling_price decimal(10,2) not null check (selling_price > 0),
    total decimal(12,2) generated always as (quantity * selling_price) stored,

    primary key (invoice_num, product_code),
    foreign key (invoice_num) references sales_invoices(invoice_num) on delete cascade,
    foreign key (product_code) references products(product_code) on delete restrict
);

create table returns (
    return_id serial primary key,
    invoice_num int not null,
    product_code varchar(25) not null,
    quantity_returned int not null check (quantity_returned > 0),
    return_reason text not null,
    return_date date not null default current_date,
    refund_amount decimal(10,2) not null check (refund_amount > 0),
    process_emp_id int not null,

    foreign key (invoice_num) references sales_invoices(invoice_num) on delete restrict,
    foreign key (product_code) references products(product_code) on delete restrict,
    foreign key (process_emp_id) references employees(emp_id) on delete set null
);

-- Triggers
create or replace function update_last_updated()
returns trigger as $$
begin
    new.last_updated := current_timestamp;
    return new;
end;
$$ language plpgsql;
create trigger trg_update_last_updated
before update on products
for each row
execute function update_last_updated();

create or replace function calculate_loyalty_points()
returns trigger as $$
begin
    new.loyalty_points_earned := round(new.final_amount * 0.05);

    if new.customer_id is not null then
        update customers
        set loyalty_points = loyalty_points + new.loyalty_points_earned
        where customer_id = new.customer_id;
    end if;

    return new;
end;
$$ language plpgsql;
create trigger trg_loyalty_points
after insert on sales_invoices
for each row
execute function calculate_loyalty_points();

create or replace function reduce_product_stock_after_sale()
returns trigger as $$
begin
    update products
    set stock = stock - new.quantity,
        last_updated = current_timestamp
    where product_code = new.product_code;

    return new;
end;
$$ language plpgsql;
create trigger trg_reduce_stock_after_sale
after insert on sales_details
for each row
execute function reduce_product_stock_after_sale();

create or replace function increase_product_stock_after_supply()
returns trigger as $$
begin
    update products
    set stock = stock + new.quantity,
        last_updated = current_timestamp
    where product_code = new.product_code;

    return new;
end;
$$ language plpgsql;
create trigger trg_increase_stock_after_supply
after insert on supply_order_details
for each row
execute function increase_product_stock_after_supply();

create or replace function increase_stock_after_return()
returns trigger as $$
begin
    update products
    set stock = stock + new.quantity_returned,
        last_updated = current_timestamp
    where product_code = new.product_code;

    return new;
end;
$$ language plpgsql;
create trigger trg_increase_stock_after_return
after insert on returns
for each row
execute function increase_stock_after_return();

create or replace function reduce_loyalty_points_on_return()
returns trigger as $$
declare
    points_to_deduct int;
begin
    points_to_deduct := round(new.refund_amount * 0.05);
    if new.invoice_num is not null then
        declare
            cust_id int;
            current_points int;
        begin
            select customer_id into cust_id from sales_invoices where invoice_num = new.invoice_num;
            if cust_id is not null then
                select loyalty_points into current_points from customers where customer_id = cust_id;
                if current_points is null then
                    current_points := 0;
                end if;
                update customers
                set loyalty_points = greatest(current_points - points_to_deduct, 0)
                where customer_id = cust_id;
            end if;
        end;
    end if;
    return new;
end;
$$ language plpgsql;
create trigger trg_reduce_loyalty_points_on_return
after insert on returns
for each row
execute function reduce_loyalty_points_on_return();

create or replace function update_loyalty_points_earned()
returns trigger as $$
begin
    update sales_invoices
    set loyalty_points_earned = round(new.final_amount * 0.05)
    where invoice_num = new.invoice_num;
    return new;
end;
$$ language plpgsql;
create trigger trg_update_loyalty_points_earned
after insert on sales_invoices
for each row
execute function update_loyalty_points_earned();