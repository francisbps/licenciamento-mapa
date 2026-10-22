-- Base de dados própria de condicionantes (PostGIS).
-- Uma linha por área (polígono, linha ou ponto) descarregada de uma fonte oficial.
create extension if not exists postgis;

create table if not exists condicionantes (
  id bigserial primary key,
  fonte text not null,          -- código da fonte, ex.: "DGT_AA"
  camada text not null,         -- nome da camada no serviço de origem
  app text,                     -- chave da condicionante na app (aero, ren, pat...)
  entidade text,                -- entidade a consultar
  nome text,                    -- designação concreta, quando a fonte a tem
  atributos jsonb,              -- restantes campos da fonte
  geom geometry(Geometry, 4326) not null,
  atualizado timestamptz not null default now()
);
create index if not exists condicionantes_geom on condicionantes using gist (geom);
create index if not exists condicionantes_fonte on condicionantes (fonte);

-- Estado de cada carregamento, para a app mostrar a data e avisar quando uma fonte falha.
create table if not exists fontes (
  fonte text primary key,
  descricao text,
  url text,
  ok boolean,
  elementos integer,
  ultima_tentativa timestamptz,
  ultimo_sucesso timestamptz,
  erro text
);

-- "Que condicionantes tocam este ponto, ou estão a menos de raio metros?"
create or replace function condicionantes_em(lat double precision, lng double precision, raio double precision default 0)
returns table (app text, entidade text, camada text, nome text, fonte text, distancia_m double precision, atualizado timestamptz)
language sql stable as $$
  with p as (select st_setsrid(st_makepoint(lng, lat), 4326) as g)
  select c.app, c.entidade, c.camada, c.nome, c.fonte,
         round(st_distance(c.geom::geography, p.g::geography)::numeric, 1)::double precision,
         c.atualizado
  from condicionantes c, p
  where case when raio > 0 then st_dwithin(c.geom::geography, p.g::geography, raio)
             else st_intersects(c.geom, p.g) end
  order by 6, c.app;
$$;

-- A app só lê: leitura pública, escrita apenas pelo carregamento (service role).
alter table condicionantes enable row level security;
alter table fontes enable row level security;
drop policy if exists leitura on condicionantes;
create policy leitura on condicionantes for select using (true);
drop policy if exists leitura on fontes;
create policy leitura on fontes for select using (true);
grant execute on function condicionantes_em to anon, authenticated;
