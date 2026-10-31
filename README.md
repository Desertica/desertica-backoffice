# desertica-backoffice

Aplicación interna del staff de Desertica para operar el negocio: reservas, calendario de salidas, pagos y reembolsos, comprobantes electrónicos, clientes, reclamos y configuración. Angular 21 (standalone, zoneless), Tailwind v4 y Spartan/ui. Consume `desertica-api`; no tiene base de datos propia.

## Cómo correrlo

Requiere Node 22.

```bash
npm ci
npm start      # http://localhost:4200
```

La app lee `public/config.json` (`apiBaseUrl`, `googleClientId`). Para trabajar sin el API real, clona `desertica-api` al lado y usa `npm run mock` (Prism en :4010) con `http://localhost:4200/?mock`.

Calidad: `npm run lint`, `npm run format` (solo comprueba), `npm test`, `npm run build`.

## Docker

```bash
docker build -t desertica-backoffice .
docker run -p 8080:8080 -e API_BASE_URL=https://api.example.com -e GOOGLE_CLIENT_ID=... desertica-backoffice
```

nginx sin privilegios en :8080. Variables:

| Variable           | Obligatoria | Descripción                                                                                                                                 |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_BASE_URL`     | Sí          | URL absoluta `http(s)` del API (mismo sitio que el backoffice, p. ej. `admin.` y `api.`). Si falta o es relativa, el contenedor no arranca. |
| `GOOGLE_CLIENT_ID` | No          | Cliente OAuth de Google Identity Services para el login.                                                                                    |

El origen de `API_BASE_URL` se usa automáticamente en `connect-src` del CSP; no hay que configurarlo aparte. Ver `.env.example`.

Más detalle (reglas, estructura, ramas): [`CLAUDE.md`](CLAUDE.md).
