-- Tabel payments untuk Midtrans integration
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  amount decimal(12,2) not null,
  status varchar(20) default 'PENDING',
  midtrans_token text,
  midtrans_transaction_id varchar(100),
  payment_method varchar(50),
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_payments_status on public.payments(status);
