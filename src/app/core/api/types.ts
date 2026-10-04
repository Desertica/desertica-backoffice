import type { components } from './schema';

type S = components['schemas'];

export type Currency = S['Currency'];
export type Meta = S['Meta'];
export type Departure = S['Departure'];
export type DepartureStatus = S['DepartureStatus'];
export type CreateDeparture = S['CreateDeparture'];
export type UpdateDeparture = S['UpdateDeparture'];
export type Manifest = S['Manifest'];
export type TourRef = S['TourRef'];
export type Booking = S['Booking'];
export type BookingSummary = S['BookingSummary'];
export type BookingStatus = S['BookingStatus'];
export type CreateManualBooking = S['CreateManualBooking'];
export type UpdateBooking = S['UpdateBooking'];
export type Passenger = S['Passenger'];
export type PassengerInput = S['PassengerInput'];
export type Billing = S['Billing'];
export type Customer = S['Customer'];
export type CustomerInput = S['CustomerInput'];
export type Payment = S['Payment'];
export type PaymentKind = S['PaymentKind'];
export type PaymentLink = S['PaymentLink'];
export type Document = S['Document'];
export type Waiver = S['Waiver'];
export type DashboardSummary = S['DashboardSummary'];
export type Quote = S['Quote'];
export type IdDocType = S['IdDocType'];
export type TourFormat = S['TourFormat'];

export interface Page<T> {
  data: T[];
  meta: Meta;
}

export type Refund = S['Refund'];
export type Dispute = S['Dispute'];
export type DisputeStatus = S['DisputeStatus'];
export type Complaint = S['Complaint'];
export type ComplaintStatus = S['ComplaintStatus'];
export type User = S['User'];
export type Role = S['Role'];
export type Company = S['Company'];
export type CompanyInput = S['CompanyInput'];
export type Series = S['Series'];
export type BlockedIdentity = S['BlockedIdentity'];
export type AuditLog = S['AuditLog'];
export type LegalDocument = S['LegalDocument'];
export type LegalDocumentKind = S['LegalDocumentKind'];
export type PaymentStatus = S['PaymentStatus'];
export type PaymentProvider = S['PaymentProvider'];
export type DocumentStatus = S['DocumentStatus'];
export type DocumentType = S['DocumentType'];
