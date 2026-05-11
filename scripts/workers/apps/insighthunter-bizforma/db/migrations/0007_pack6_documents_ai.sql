create table if not exists formation_documents (
  id text primary key,
  tenant_id text not null,
  business_id text not null,
  created_by text not null,
  kind text not null,
  file_name text not null,
  object_key text not null unique,
  content_type text not null,
  status text not null default 'pending',
  size_bytes integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_formation_documents_tenant_business
  on formation_documents (tenant_id, business_id, created_at desc);
