-- Run once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Creates a dedicated DB user for Prisma with privileges on public schema.
-- Replace 'your_secure_password' before running.

create user "prisma" with password 'your_secure_password' bypassrls createdb;

grant "prisma" to "postgres";

grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
