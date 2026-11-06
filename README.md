# Employee management app

Vue 3 + Spring Boot employee management sample (batch B20261106-165207).

## Layout

- `backend/` — Spring Boot 3.5 / Spring Cloud 2025 REST service, H2 file database.
- `frontend/` — Vue 3 + Vite + Element Plus SPA.
- `e2e/` — Playwright end-to-end checks used for batch self-test evidence.

## Build

```powershell
mvn -f backend/pom.xml package
npm --prefix frontend ci
npm --prefix frontend run build
```

## Run

```powershell
# terminal 1
mvn -f backend/pom.xml spring-boot:run
# terminal 2
npm --prefix frontend run dev
```

Open http://127.0.0.1:5173/employees. The Vite dev server proxies `/api` to http://127.0.0.1:8080.
The backend stores data in `backend/data/employeedb.mv.db`, so records survive restarts.
