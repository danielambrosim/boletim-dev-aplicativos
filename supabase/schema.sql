-- Boletim — Desenvolvimento de Aplicativos
-- Rode isto no SQL Editor do Supabase (Project → SQL Editor → New query → Run).
-- Idempotente: pode rodar de novo sem duplicar (usa IF NOT EXISTS / OR REPLACE).

-- ---------- Perfis ----------
-- Espelha auth.users com um perfil próprio (nome, email) que o RLS consegue referenciar.
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

-- Cria a linha em usuarios automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Estrutura acadêmica ----------
create table if not exists public.materias (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  materia_id uuid not null references public.materias(id) on delete cascade,
  nome text not null,
  periodo text not null,
  pass_threshold numeric not null default 6,
  recovery_threshold numeric not null default 4,
  created_at timestamptz not null default now()
);

-- Monitor com acesso de leitura a uma turma específica (atribuído pelo professor dono).
create table if not exists public.turma_colaboradores (
  turma_id uuid not null references public.turmas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (turma_id, usuario_id)
);

create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  nome text not null,
  peso numeric not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.notas (
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  valor numeric,
  updated_at timestamptz not null default now(),
  primary key (aluno_id, avaliacao_id)
);

-- ---------- Funções auxiliares de acesso (usadas pelas policies) ----------
create or replace function public.owns_turma(t_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from turmas t
    join materias m on m.id = t.materia_id
    where t.id = t_id and m.professor_id = auth.uid()
  );
$$;

create or replace function public.can_read_turma(t_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select owns_turma(t_id) or exists (
    select 1 from turma_colaboradores c
    where c.turma_id = t_id and c.usuario_id = auth.uid()
  );
$$;

-- ---------- Row Level Security ----------
alter table public.usuarios enable row level security;
alter table public.materias enable row level security;
alter table public.turmas enable row level security;
alter table public.turma_colaboradores enable row level security;
alter table public.alunos enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.notas enable row level security;

-- usuarios: cada um só lê/edita o próprio perfil.
drop policy if exists usuarios_select_own on public.usuarios;
create policy usuarios_select_own on public.usuarios
  for select using (id = auth.uid());
drop policy if exists usuarios_update_own on public.usuarios;
create policy usuarios_update_own on public.usuarios
  for update using (id = auth.uid());

-- materias: dono tem CRUD; colaborador de alguma turma da matéria só lê.
drop policy if exists materias_select on public.materias;
create policy materias_select on public.materias
  for select using (
    professor_id = auth.uid()
    or exists (select 1 from turmas t where t.materia_id = materias.id and can_read_turma(t.id))
  );
drop policy if exists materias_write on public.materias;
create policy materias_write on public.materias
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

-- turmas: leitura para dono ou colaborador; escrita só para o dono da matéria.
drop policy if exists turmas_select on public.turmas;
create policy turmas_select on public.turmas
  for select using (can_read_turma(id));
drop policy if exists turmas_write on public.turmas;
create policy turmas_write on public.turmas
  for all using (owns_turma(id))
  with check (exists (select 1 from materias m where m.id = materia_id and m.professor_id = auth.uid()));

-- turma_colaboradores: usuário vê a própria atribuição; só o dono da turma gerencia a lista.
drop policy if exists colaboradores_select on public.turma_colaboradores;
create policy colaboradores_select on public.turma_colaboradores
  for select using (usuario_id = auth.uid() or owns_turma(turma_id));
drop policy if exists colaboradores_write on public.turma_colaboradores;
create policy colaboradores_write on public.turma_colaboradores
  for all using (owns_turma(turma_id)) with check (owns_turma(turma_id));

-- alunos / avaliacoes: leitura para dono ou colaborador; escrita só para o dono.
drop policy if exists alunos_select on public.alunos;
create policy alunos_select on public.alunos
  for select using (can_read_turma(turma_id));
drop policy if exists alunos_write on public.alunos;
create policy alunos_write on public.alunos
  for all using (owns_turma(turma_id)) with check (owns_turma(turma_id));

drop policy if exists avaliacoes_select on public.avaliacoes;
create policy avaliacoes_select on public.avaliacoes
  for select using (can_read_turma(turma_id));
drop policy if exists avaliacoes_write on public.avaliacoes;
create policy avaliacoes_write on public.avaliacoes
  for all using (owns_turma(turma_id)) with check (owns_turma(turma_id));

-- notas: acesso segue a turma da avaliação correspondente.
drop policy if exists notas_select on public.notas;
create policy notas_select on public.notas
  for select using (
    exists (select 1 from avaliacoes a where a.id = notas.avaliacao_id and can_read_turma(a.turma_id))
  );
drop policy if exists notas_write on public.notas;
create policy notas_write on public.notas
  for all using (
    exists (select 1 from avaliacoes a where a.id = notas.avaliacao_id and owns_turma(a.turma_id))
  )
  with check (
    exists (select 1 from avaliacoes a where a.id = notas.avaliacao_id and owns_turma(a.turma_id))
  );
