# Expense Tracker

CRUD expense tracker web application.

## Running Locally

To run the application locally we assume you already have [node](https://nodejs.org/en/download) and [bun](https://bun.com/docs/installation) installed on your local machine. Once the repository is cloned you can begin installing all package dependecies by running.
```bash
bun install
```

Once all dependencies are installed you may begin creating a local D1 database by running
```bash
bun wrangler d1 migrations apply xpens --local
```

You may now run to start the local development server.
```bash
bun dev
```
