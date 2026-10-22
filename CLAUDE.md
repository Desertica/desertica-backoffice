# Desertica backoffice

Aplicación interna del staff de Desertica para operar el negocio: reservas, calendario de salidas, pagos y reembolsos, comprobantes electrónicos, clientes, reclamos y configuración. Consume `Desertica/desertica-api`; no tiene base de datos propia. Hoy opera con 2 personas y dos roles (`admin` y `operator`).

El plan completo y el contrato están en `Desertica/desertica-api` (`openapi/openapi.yaml`, `docs/PENDIENTES.md`). Solo hace falta clonarlo al lado (`../desertica-api`) para regenerar los tipos o usar el mock; instalar, lint, tests y build (y por tanto CI) no lo necesitan.

## Stack

Angular 21 (standalone, zoneless), Tailwind v4, Spartan/ui. Usa los mismos componentes Spartan que `Desertica/desertica-web`, pero `libs/ui` es una copia generada aquí, no una librería compartida: un cambio en uno no llega al otro. Sin SSR: es una aplicación de staff detrás de login.

## Rules

- **El contrato es `openapi/openapi.yaml` del repo del API.** Los tipos se generan con `openapi-typescript` y se llama con `openapi-fetch` (no hay paquete publicado); no escribas llamadas HTTP a mano ni inventes endpoints. Si falta algo, se pide un cambio de contrato por PR en el API.
- **Login con Google** restringido al dominio de la empresa; el API emite el JWT.
- **Sesión por cookie**: el refresh token vive en una cookie `desertica_refresh` (`HttpOnly; Secure; SameSite=Strict; Path=/api/auth`) que el navegador envía solo a `/auth/*` (`credentials: 'include'`); la app nunca la lee ni usa `sessionStorage`. El token de acceso vive solo en memoria y, al recargar, la app llama a `/auth/refresh`. **Requisito de despliegue: el backoffice y el API deben estar en el mismo sitio** (subdominios del mismo dominio, p. ej. `admin.` y `api.`), si no `SameSite=Strict` descarta la cookie; el API debe tener el origen del backoffice en `CORS_ORIGINS` (CORS con credenciales) y el CSP del nginx permite `connect-src` solo al origen de `API_BASE_URL` (se deriva en `docker/15-api-origin.envsh`). La interfaz se adapta a los permisos que devuelve `GET /auth/me` (`x-permission` de cada operación): oculta lo que el rol no puede hacer, pero la autorización real es del API.
- Dinero en enteros (`*Cents`) con IGV incluido; formatea con la moneda de cada reserva (`USD` o `PEN`) y nunca sumes monedas distintas.
- Fechas en UTC desde el API; muéstralas en `America/Lima`.
- Todo texto de interfaz va en `en` y `es`.
- Sin analítica de marketing ni scripts de terceros en esta aplicación. Única excepción: Google Identity Services, cargado solo en la pantalla de login.
- Nunca commitees `.env`, `.cursor/` ni `.vscode/`.

## Commands

Usa **Node 22**. `../desertica-api` (clonado al lado) solo se necesita para `api:generate` y `mock`.

```bash
npm ci
npm start                 # http://localhost:4200 (lee public/config.json: apiBaseUrl, googleClientId)
npm run mock              # Prism sirve el contrato en http://localhost:4010 con ejemplos realistas (scripts/mock.mjs);
                          #   MOCK_ROLE=operator npm run mock  -> permisos del operador (por defecto admin)
                          #   con el mock: abre http://localhost:4200/?mock (solo en dev; botón "Mock (dev)")
npm run api:generate      # regenera src/app/core/api/schema.d.ts desde ../desertica-api/openapi/openapi.yaml (se commitea)
npm run lint && npm test && npm run build && npm run format   # `format` solo comprueba (prettier --check); corrige con `npx prettier --write .`
docker build -t desertica-backoffice .   # nginx non-root en :8080; env: API_BASE_URL (obligatoria, URL http(s) absoluta; si falta o es relativa el contenedor no arranca), GOOGLE_CLIENT_ID
```

## Estructura

- `src/app/core/`: configuración en runtime (`/config.json`), cliente de API (`openapi-fetch` + interceptor de token y refresh), autenticación (`AuthService`, guards, directiva `*appHasPermission`), i18n (`es` principal, `en`; las claves están tipadas, ambos idiomas deben tener las mismas), tema y formato de dinero y fechas.
- `src/app/layout/`: shell (barra lateral, cabecera, idioma, tema). `src/app/features/<funcionalidad>/`: una carpeta por pantalla, cargada con `loadComponent`.
- `libs/ui/`: copia generada de los componentes Spartan (helm) con `npx ng g @spartan-ng/cli:ui <nombre>`; no se edita a mano, ni se lintea ni se formatea (está en `.prettierignore`).
- Llamadas al API: siempre `ApiClient.http` (tipado por el contrato) + `unwrap()`. Textos: añade la clave en `messages.es.ts` y `messages.en.ts`.

## Ramas

`main` es solo la base; el trabajo entra por PR a `develop`, `develop` -> `staging` (pruebas) y `staging` -> `prod` (producción). Rama de trabajo: `feat/*`, `fix/*` o `chore/*`, se borra al mezclar. Los checks y la protección están en `docs/PROTECCION-RAMAS.md`; los workflows son `.github/workflows/{ci,security,policy}.yml` y los editas con un PR normal.
