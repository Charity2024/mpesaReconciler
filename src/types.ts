export interface MpesaRecord {
  code: string;
  name?: string;
}

export interface ReconciliationResult {
  payments: MpesaRecord[];
  tickets: MpesaRecord[];
  missingTickets: MpesaRecord[]; // Paid but no ticket
  invalidTickets: MpesaRecord[]; // Ticket but no payment
  validTickets: MpesaRecord[];   // Paid and ticket generated
}
