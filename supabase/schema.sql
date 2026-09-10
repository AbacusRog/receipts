-- Intake: document capture schema
-- Run this in the Supabase SQL editor for the project this app will use.

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_path text not null,          -- path within the 'receipts' storage bucket
  file_name text not null,
  file_type text not null,
  source text not null default 'upload' check (source in ('upload', 'email')),
  status text not null default 'pending'
    check (status in ('pending','processing','needs_review','confirmed','exported','failed')),
  client_name text,
  uploaded_by text
);

create table if not exists extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  supplier text,
  document_date date,
  net_amount numeric(12,2),
  vat_amount numeric(12,2),
  total_amount numeric(12,2),
  currency text default 'GBP',
  category text,
  notes text,
  confidence numeric(3,2),
  raw_response jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_extractions_document_id on extractions(document_id);
create index if not exists idx_documents_status on documents(status);

-- Storage bucket for the original receipt/invoice files (create via Dashboard > Storage,
-- or run this if the storage schema is available in your project):
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Row Level Security: lock everything behind an authenticated session.
alter table documents enable row level security;
alter table extractions enable row level security;

create policy "Authenticated users can read documents"
  on documents for select
  to authenticated
  using (true);

create policy "Authenticated users can insert documents"
  on documents for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update documents"
  on documents for update
  to authenticated
  using (true);

create policy "Authenticated users can read extractions"
  on extractions for select
  to authenticated
  using (true);

create policy "Authenticated users can insert extractions"
  on extractions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update extractions"
  on extractions for update
  to authenticated
  using (true);

-- Storage policies: authenticated users can upload/read receipt files.
create policy "Authenticated read receipts"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'receipts');

create policy "Authenticated upload receipts"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipts');
