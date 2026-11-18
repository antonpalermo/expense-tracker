# SPEC-000 Authentication Refactor

| Info         | Details                                   |
| ------------ | ----------------------------------------- |
| **Author**   | Anton Palermo <anpbusinessmail@gmail.com> |
| **Reviewer** | Not Applicable                            |
| **Status**   | Approved                                  |
| **Date**     | 2026-11-16                                |

## Context

Authentication is already implemented using `better-auth`. We need to setup the CLI and update some things in the whole process especially the
`email` and `password` authentication, basically the whole authentication flow.

## Goal

- Refactor the whole authentication flow.
  - Sign In need to make sure both `email` and `password` works properly.
  - Update button label from `github` to `google`
  - Make sure sign up flow works

## None Goals

- NA
