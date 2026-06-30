-- 7.3 RAG — Embeddings de los ejercicios para búsqueda semántica.
--
-- El corpus es el contenido YA validado de la app (tabla `exercises`): no se
-- introduce contenido clínico nuevo. El chat usa esto para recomendar/citar
-- ejercicios reales con precisión.
--
-- Idempotente: usa IF NOT EXISTS. Aplicar vía `supabase db push` o el SQL
-- Editor de Supabase.

-- 1. Extensión pgvector
create extension if not exists vector;

-- 2. Tabla de embeddings (1:1 con exercises; se borra en cascada)
--    Dimensión 1536 = OpenAI text-embedding-3-small.
create table if not exists exercise_embeddings (
  -- exercises.id es de tipo text (no uuid), así que la FK debe coincidir.
  exercise_id text primary key references exercises(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  updated_at timestamptz not null default now()
);

-- 3. Índice ANN (HNSW, distancia coseno). Sirve aunque haya pocos registros.
create index if not exists exercise_embeddings_embedding_idx
  on exercise_embeddings
  using hnsw (embedding vector_cosine_ops);

-- 4. RLS: el contenido de ejercicios NO es sensible (no es PII ni salud del
--    usuario). Lectura para usuarios autenticados; escritura solo service role.
alter table exercise_embeddings enable row level security;

drop policy if exists "exercise_embeddings_read" on exercise_embeddings;
create policy "exercise_embeddings_read"
  on exercise_embeddings
  for select
  to authenticated
  using (true);

-- 5. Función de búsqueda semántica. Devuelve los ejercicios más cercanos al
--    embedding de consulta, junto a su similitud coseno (1 = idéntico).
--    SECURITY INVOKER: respeta la RLS de quien llama.
create or replace function match_exercises(
  query_embedding vector(1536),
  match_count int default 3,
  similarity_threshold float default 0.2
)
returns table (
  exercise_id text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    e.exercise_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from exercise_embeddings e
  where e.embedding is not null
    and 1 - (e.embedding <=> query_embedding) >= similarity_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
