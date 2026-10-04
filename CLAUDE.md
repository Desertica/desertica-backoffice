# Desertica backoffice

Aplicación interna del staff de Desertica para operar el negocio: reservas, calendario de salidas, pagos y reembolsos, comprobantes electrónicos, clientes, reclamos y configuración. Consume `Desertica/desertica-api`; no tiene base de datos propia. Hoy opera con 2 personas y dos roles (`admin` y `operator`).

Repo recién creado: todavía no tiene código. El plan completo y el contrato están en `Desertica/desertica-api` (`openapi/openapi.yaml`, `docs/PENDIENTES.md`).

## Stack previsto

Angular 21 (standalone, zoneless), Tailwind v4, Spartan/ui. Reutiliza la misma librería de componentes que `Desertica/desertica-web` (`libs/ui`) para no mantener dos sistemas de diseño. Sin SSR: es una aplicación de staff detrás de login.

## Rules

- **El contrato es `openapi/openapi.yaml` del repo del API.** El cliente se genera a partir de él (`@desertica/api-client`); no escribas llamadas HTTP a mano ni inventes endpoints. Si falta algo, se pide un cambio de contrato por PR en el API.
- **Login con Google** restringido al dominio de la empresa; el API emite el JWT. La interfaz se adapta a los permisos que devuelve `GET /auth/me` (`x-permission` de cada operación): oculta lo que el rol no puede hacer, pero la autorización real es del API.
- Dinero en enteros (`*Cents`) con IGV incluido; formatea con la moneda de cada reserva (`USD` o `PEN`) y nunca sumes monedas distintas.
- Fechas en UTC desde el API; muéstralas en `America/Lima`.
- Todo texto de interfaz va en `en` y `es`.
- Sin analítica de marketing ni scripts de terceros en esta aplicación.
- Nunca commitees `.env`, `.cursor/` ni `.vscode/`.

## Commands

Se completan al crear el esqueleto de la aplicación (Ola 1). Usa **Node 22**.
