# SPEC-000 Database Refactor

| Info         | Details                                   |
| ------------ | ----------------------------------------- |
| **Author**   | Anton Palermo <anpbusinessmail@gmail.com> |
| **Reviewer** | Not Applicable                            |
| **Status**   | Approved                                  |
| **Date**     | 2026-11-15                                |

## Context

Database is currently setup using `drizzle-orm` with `cloudflare-d1`. `./worker/database/db.ts` works
properly but we need to create a new function that would return a drizzle instance.

## Goal

- setup a function that would accept `D1` database as its parameters and return a drizzle instance.

## None Goals

- Update the whole schema table.
