// Starts Prism over the API contract with realistic examples layered on top, so the mock honours
// permissions. The contract itself (../desertica-api) is never modified: the overlay is written to
// `.mock/openapi.yaml` (git-ignored). `MOCK_ROLE=operator npm run mock` serves the operator's permissions.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';

const CONTRACT = process.env.CONTRACT ?? '../desertica-api/openapi/openapi.yaml';
const role = process.env.MOCK_ROLE === 'operator' ? 'operator' : 'admin';

// Same lists as `src/modules/auth/permissions.ts` in the API (admin = everything).
const OPERATOR = [
  'bookings:read',
  'bookings:write',
  'bookings:cancel',
  'departures:read',
  'departures:write',
  'catalog:read',
  'prices:read',
  'customers:read',
  'customers:write',
  'payments:read',
  'payments:write',
  'payments:refund',
  'documents:read',
  'documents:issue',
  'complaints:read',
  'complaints:write',
  'waivers:read',
  'reports:read',
];

const text = readFileSync(CONTRACT, 'utf8');
const doc = parse(text);
const fromContract = [...text.matchAll(/x-permission:\s*([a-z-]+:[a-z-]+)/g)].map((m) => m[1]);
const ADMIN = [...new Set([...fromContract, 'bookings:override', 'payments:refund-any'])].sort();

const permissions = role === 'admin' ? ADMIN : OPERATOR;
const user = {
  id: '3f6d2c1e-8a4b-4f0e-9a51-2b7c6d5e4f30',
  email: role === 'admin' ? 'admin@desertica.pe' : 'operador@desertica.pe',
  name: role === 'admin' ? 'Admin Desertica' : 'Operador Desertica',
  active: true,
  role: {
    id:
      role === 'admin'
        ? 'a1b2c3d4-0000-4000-8000-000000000001'
        : 'a1b2c3d4-0000-4000-8000-000000000002',
    key: role,
    name: role === 'admin' ? 'Administrador' : 'Operador',
    permissions,
  },
  lastLoginAt: '2026-10-04T14:05:00.000Z',
};

const schemas = doc.components.schemas;
schemas.Role.example = user.role;
schemas.User.example = user;
schemas.Session.example = { accessToken: 'mock-access-token', expiresIn: 900, user };
schemas.Settings.example = {
  depositPercent: 30,
  holdMinutes: 15,
  operatorRefundLimitCents: 20000,
  complaintDueDays: 15,
};
schemas.CancellationQuote.example = {
  currency: 'USD',
  paidCents: 12000,
  refundCents: 6000,
  refundPercent: 50,
  tier: { hoursBefore: 24, refundPercent: 50 },
  policyVersion: 3,
  reason: null,
};
schemas.Quote.example = {
  currency: 'USD',
  totalCents: 24000,
  depositCents: 7200,
  lines: [{ label: 'Adultos', quantity: 2, unitCents: 12000, totalCents: 24000 }],
  cancellationTiers: [
    { hoursBefore: 48, refundPercent: 100 },
    { hoursBefore: 24, refundPercent: 50 },
  ],
};

schemas.Meta.example = { page: 1, pageSize: 25, total: 1 };
schemas.Departure.example = {
  id: '5b1f7a52-3c0d-4e0b-9d2a-0c6a1f6e7b11',
  tourRefId: '9c3e1f4a-52d7-4b88-a1c0-7d2e5f6a8b90',
  tourSlug: 'sandboarding-huacachina',
  tourTitle: 'Sandboarding en Huacachina',
  startsAt: '2026-10-11T21:00:00.000Z',
  capacity: 12,
  seatsSold: 7,
  seatsHeld: 1,
  format: 'SHARED',
  language: 'es',
  status: 'OPEN',
  meetingPoint: 'Plaza de Armas de Ica',
  guideName: 'Luis Quispe',
  vehicleNote: 'Buggy 3',
  notes: null,
  cutoffMinutes: 120,
};
schemas.BookingSummary.example = {
  id: '0d8a6c43-1e7b-4f5a-8b2c-9e1d3a5c7f20',
  reference: 'DSR-4F7K2M',
  status: 'CONFIRMED',
  source: 'WEB',
  departureId: schemas.Departure.example.id,
  startsAt: '2026-10-11T21:00:00.000Z',
  tourSlug: 'sandboarding-huacachina',
  tourTitle: 'Sandboarding en Huacachina',
  customerName: 'Ana Ríos',
  adults: 2,
  children: 1,
  currency: 'USD',
  totalCents: 24000,
  paidCents: 7200,
  createdAt: '2026-10-02T15:30:00.000Z',
};
mkdirSync('.mock', { recursive: true });
writeFileSync('.mock/openapi.yaml', stringify(doc));

console.log(
  `Mock role: ${role} (${permissions.length} permissions). Set MOCK_ROLE=operator to switch.`,
);
const prism = spawn(
  'npx',
  ['prism', 'mock', '.mock/openapi.yaml', '--port', process.env.PORT ?? '4010', '--cors'],
  { stdio: 'inherit' },
);
prism.on('exit', (code) => process.exit(code ?? 0));
