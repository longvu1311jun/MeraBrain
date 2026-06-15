create extension if not exists vector;

create table if not exists wiki_documents (
  id uuid primary key default gen_random_uuid(),
  lark_token text unique not null,
  title text not null,
  url text,
  file_type text,
  raw_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists wiki_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references wiki_documents(id) on delete cascade,
  chunk_index int not null,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  lark_message_id text,
  question text not null,
  answer text,
  sources jsonb,
  created_at timestamptz default now()
);

create index if not exists wiki_chunks_embedding_idx
on wiki_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function match_wiki_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.25,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  title text,
  url text,
  chunk_text text,
  similarity float,
  metadata jsonb
)
language sql stable
as $$
  select
    wc.id,
    wc.document_id,
    wd.title,
    wd.url,
    wc.chunk_text,
    1 - (wc.embedding <=> query_embedding) as similarity,
    wc.metadata
  from wiki_chunks wc
  join wiki_documents wd on wd.id = wc.document_id
  where 1 - (wc.embedding <=> query_embedding) > match_threshold
  order by wc.embedding <=> query_embedding
  limit match_count;
$$;
