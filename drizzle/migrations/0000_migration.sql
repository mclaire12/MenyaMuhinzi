create type public.app_role as enum ('farmer','facilitator','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  district text,
  sector text,
  preferred_language text not null default 'rw',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'facilitator'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone) values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  insert into public.user_roles (user_id, role) values (new.id, 'farmer');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.vegetables (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_rw text not null,
  name_en text not null,
  sort_order int not null default 0
);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  vegetable_id uuid not null references public.vegetables(id) on delete cascade,
  slug text unique not null,
  title text not null,
  description text not null,
  level text not null default 'Intangiriro',
  status text not null default 'published' check (status in ('draft','in_review','published','archived')),
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  summary text not null default '',
  body text not null default '',
  key_points text[] not null default '{}',
  duration_minutes int not null default 10,
  audio_url text,
  video_url text,
  sort_order int not null default 0
);
create index on public.courses(vegetable_id);
create index on public.course_modules(course_id);
create index on public.lessons(module_id);

grant select on public.vegetables, public.courses, public.course_modules, public.lessons to anon, authenticated;
grant insert, update, delete on public.courses, public.course_modules, public.lessons to authenticated;
grant all on public.vegetables, public.courses, public.course_modules, public.lessons to service_role;
alter table public.vegetables enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;

create policy "public vegetables" on public.vegetables for select using (true);
create policy "published courses" on public.courses for select using (status = 'published' or public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin'));
create policy "staff manage courses" on public.courses for all to authenticated using (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin'));
create policy "modules read" on public.course_modules for select using (exists (select 1 from public.courses c where c.id = course_id));
create policy "staff manage modules" on public.course_modules for all to authenticated using (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin'));
create policy "lessons read" on public.lessons for select using (exists (select 1 from public.course_modules m where m.id = module_id));
create policy "staff manage lessons" on public.lessons for all to authenticated using (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin'));

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  channel text not null default 'web' check (channel in ('web','ussd','ivr')),
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  channel text not null default 'web' check (channel in ('web','ussd','ivr')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index on public.enrollments(user_id);
create index on public.lesson_progress(user_id);
grant select, insert, update, delete on public.enrollments, public.lesson_progress to authenticated;
grant all on public.enrollments, public.lesson_progress to service_role;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
create policy "own enrollments" on public.enrollments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "staff read enrollments" on public.enrollments for select to authenticated using (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin'));
create policy "own progress" on public.lesson_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "staff read progress" on public.lesson_progress for select to authenticated using (public.has_role(auth.uid(),'facilitator') or public.has_role(auth.uid(),'admin'));

-- Seed
insert into public.vegetables (slug,name_rw,name_en,sort_order) values
 ('tomato','Inyanya','Tomato',1),('cabbage','Amashu','Cabbage',2),('carrot','Karoti','Carrot',3);

insert into public.courses (vegetable_id, slug, title, description) values
 ((select id from public.vegetables where slug='tomato'),'ubuhinzi-bw-inyanya','Ubuhinzi bw''inyanya','Menya guhitamo imbuto, gutegura umurima, kwita ku nyanya no kuzisarura neza.'),
 ((select id from public.vegetables where slug='cabbage'),'ubuhinzi-bw-amashu','Ubuhinzi bw''amashu','Iga gutegura ingemwe, kuzitera, kurwanya udukoko no gusarura amashu meza.'),
 ((select id from public.vegetables where slug='carrot'),'ubuhinzi-bwa-karoti','Ubuhinzi bwa karoti','Menya ubutaka bukwiye karoti, kubiba, kubagara no gusarura karoti nziza.');

do $$
declare c record; m1 uuid; m2 uuid; m3 uuid; veg text;
begin
  for c in select co.id, v.name_rw from public.courses co join public.vegetables v on v.id = co.vegetable_id loop
    veg := lower(c.name_rw);
    insert into public.course_modules (course_id,title,sort_order) values (c.id,'Gutegura umurima',1) returning id into m1;
    insert into public.course_modules (course_id,title,sort_order) values (c.id,'Gutera no kwita ku bihingwa',2) returning id into m2;
    insert into public.course_modules (course_id,title,sort_order) values (c.id,'Gusarura no kubika',3) returning id into m3;
    insert into public.lessons (module_id,title,summary,body,key_points,sort_order) values
     (m1,'Guhitamo aho guhinga','Aho '||veg||' zera neza.','Hitamo umurima ubona izuba nibura amasaha atandatu ku munsi. Ubutaka bugomba kuba bworoshye kandi butareka amazi. Irinde guhinga '||veg||' aho wahinze ibihingwa byo mu muryango umwe mu gihembwe gishize.', array['Izuba amasaha 6 ku munsi','Ubutaka butareka amazi','Simburanya ibihingwa'],1),
     (m1,'Gutegura ubutaka n''ifumbire','Uko wategura ubutaka.','Hinga ubutaka neza, ukureho ibyatsi n''amabuye. Shyiramo ifumbire y''imborera yaboze neza ibyumweru bibiri mbere yo gutera. Ifumbire nziza yongera umusaruro.', array['Kuraho ibyatsi','Ifumbire y''imborera yaboze','Tegura ibyumweru 2 mbere'],2),
     (m2,'Gutera','Intera n''uburyo bwo gutera.','Tera ku ntera ikwiye kugira ngo ibihingwa bibone umwuka n''izuba. Vomera neza nyuma yo gutera. Tera mu gitondo cyangwa nimugoroba.', array['Intera ikwiye','Vomera nyuma yo gutera','Tera mu gitondo cyangwa nimugoroba'],1),
     (m2,'Kurwanya udukoko n''indwara','Menya ibimenyetso hakiri kare.','Genzura umurima buri cyumweru. Reba amababi afite amabara adasanzwe cyangwa udukoko. Kuraho ibihingwa birwaye. Baza umujyanama w''ubuhinzi mbere yo gukoresha imiti.', array['Genzura buri cyumweru','Kuraho ibirwaye','Baza umujyanama'],2),
     (m3,'Gusarura','Igihe n''uburyo bwo gusarura.','Sarura igihe ibihingwa byeze neza. Koresha ibikoresho bisukuye kandi wirinde gukomeretsa umusaruro. Sarura mu gihe hakonje.', array['Sarura byeze','Ibikoresho bisukuye','Sarura hakonje'],1),
     (m3,'Kubika no kugurisha','Uko wabika umusaruro neza.','Bika umusaruro ahantu hakonje kandi hari umwuka. Tandukanya umusaruro mwiza n''uwangiritse. Shaka isoko mbere yo gusarura.', array['Ahantu hakonje','Tandukanya umusaruro','Shaka isoko kare'],2);
  end loop;
end $$;