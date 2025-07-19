import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Client {
  id: string;
  name: string;
  company_name?: string;
  phone: string;
  email?: string;
  address?: string;
  gst_number?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface StockCategory {
  id: string;
  name: string;
  description?: string;
  daily_rate: number;
  size_specification?: string;
  weight_kg?: number;
  material?: string;
  created_at: string;
}

export interface StockItem {
  id: string;
  category_id: string;
  total_quantity: number;
  available_quantity: number;
  rented_quantity: number;
  damaged_quantity: number;
  minimum_stock_level?: number;
  location?: string;
  created_at: string;
  updated_at: string;
  stock_categories?: StockCategory;
}

export interface Rental {
  id: string;
  rental_number?: string;
  client_id: string;
  rental_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  status: 'active' | 'partially_returned' | 'completed' | 'cancelled';
  total_amount: number;
  notes?: string;
  signature_data?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  clients?: Client;
  rental_items?: RentalItem[];
}

export interface RentalItem {
  id: string;
  rental_id: string;
  category_id: string;
  quantity: number;
  daily_rate: number;
  returned_quantity: number;
  pending_quantity?: number;
  created_at: string;
  stock_categories?: StockCategory;
}

export interface ReturnRecord {
  id: string;
  return_number?: string;
  rental_id: string;
  return_date: string;
  total_damage_cost: number;
  notes?: string;
  inspector_name?: string;
  created_at: string;
  created_by: string;
  rentals?: Rental;
  return_items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  rental_item_id: string;
  returned_quantity: number;
  condition: 'good' | 'damaged' | 'lost';
  damage_cost: number;
  damage_description?: string;
  damage_photos?: string[];
  created_at: string;
  rental_items?: RentalItem;
}

export interface Payment {
  id: string;
  payment_number?: string;
  client_id: string;
  rental_id?: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'upi';
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by: string;
  clients?: Client;
  rentals?: Rental;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  rental_id?: string;
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  pdf_url?: string;
  created_at: string;
  created_by: string;
  clients?: Client;
  rentals?: Rental;
}