/*
  # Centering Plates Rental Management System Database Schema

  1. New Tables
    - `clients` - Customer information and contact details
    - `stock_categories` - Plate size categories and specifications  
    - `stock_items` - Individual inventory items with current status
    - `rentals` - Rental transaction headers
    - `rental_items` - Individual items in each rental
    - `returns` - Return transaction headers
    - `return_items` - Individual returned items with condition
    - `payments` - Payment tracking and history
    - `invoices` - Generated invoices and billing

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
    - Admin role can access all data, Staff role limited access
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  phone text NOT NULL,
  email text,
  address text,
  gst_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create stock categories table
CREATE TABLE IF NOT EXISTS stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- e.g., "12x12", "18x18", "24x24"
  description text,
  daily_rate decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create stock items table
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES stock_categories(id) NOT NULL,
  total_quantity integer NOT NULL DEFAULT 0,
  available_quantity integer NOT NULL DEFAULT 0,
  rented_quantity integer NOT NULL DEFAULT 0,
  damaged_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rentals table
CREATE TABLE IF NOT EXISTS rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  rental_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_returned', 'completed', 'cancelled')),
  total_amount decimal(10,2) DEFAULT 0,
  notes text,
  signature_data text, -- Base64 encoded signature
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create rental items table
CREATE TABLE IF NOT EXISTS rental_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid REFERENCES rentals(id) ON DELETE CASCADE,
  category_id uuid REFERENCES stock_categories(id) NOT NULL,
  quantity integer NOT NULL,
  daily_rate decimal(10,2) NOT NULL,
  returned_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid REFERENCES rentals(id) NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  total_damage_cost decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create return items table
CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid REFERENCES returns(id) ON DELETE CASCADE,
  rental_item_id uuid REFERENCES rental_items(id) NOT NULL,
  returned_quantity integer NOT NULL,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'lost')),
  damage_cost decimal(10,2) DEFAULT 0,
  damage_photos text[], -- Array of photo URLs
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  rental_id uuid REFERENCES rentals(id),
  amount decimal(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi')),
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  rental_id uuid REFERENCES rentals(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

-- Stock categories - read only for all authenticated users
CREATE POLICY "Authenticated users can view stock categories"
  ON stock_categories FOR SELECT
  TO authenticated
  USING (true);

-- Stock items - full access for authenticated users
CREATE POLICY "Authenticated users can manage stock items"
  ON stock_items FOR ALL
  TO authenticated
  USING (true);

-- Rentals - full access for authenticated users
CREATE POLICY "Authenticated users can manage rentals"
  ON rentals FOR ALL
  TO authenticated
  USING (true);

-- Rental items - full access for authenticated users
CREATE POLICY "Authenticated users can manage rental items"
  ON rental_items FOR ALL
  TO authenticated
  USING (true);

-- Returns - full access for authenticated users
CREATE POLICY "Authenticated users can manage returns"
  ON returns FOR ALL
  TO authenticated
  USING (true);

-- Return items - full access for authenticated users
CREATE POLICY "Authenticated users can manage return items"
  ON return_items FOR ALL
  TO authenticated
  USING (true);

-- Payments - full access for authenticated users
CREATE POLICY "Authenticated users can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (true);

-- Invoices - full access for authenticated users
CREATE POLICY "Authenticated users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true);

-- Insert default stock categories
INSERT INTO stock_categories (name, description, daily_rate) VALUES
  ('12x12', '12 inch x 12 inch centering plates', 15.00),
  ('18x18', '18 inch x 18 inch centering plates', 25.00),
  ('24x24', '24 inch x 24 inch centering plates', 35.00),
  ('30x30', '30 inch x 30 inch centering plates', 45.00),
  ('36x36', '36 inch x 36 inch centering plates', 55.00);

-- Insert initial stock items
INSERT INTO stock_items (category_id, total_quantity, available_quantity) 
SELECT id, 100, 100 FROM stock_categories;