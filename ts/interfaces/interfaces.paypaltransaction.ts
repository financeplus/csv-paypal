export interface IPayPalCsvOriginalTransaction {
  Datum: string;
  Uhrzeit: string;
  Zeitzone: string;
  Beschreibung: string;
  Währung: string;
  Brutto: string;
  Gebühr: string;
  Netto: string;
  Guthaben: string;
  Transaktionscode: string;
  'Absender E-Mail-Adresse': string;
  Name: string;
  'Name der Bank': string;
  Bankkonto: string;
  'Versand- und Bearbeitungsgebühr': string;
  Umsatzsteuer: string;
  Rechnungsnummer: string;
  'Zugehöriger Transaktionscode': string;
}

export interface IPayPalTransaction {
  // standardised
  originalTransaction
  transactionHash: string;
  
  // specific
  transactionCode: string;
  transactionDate: Date;
  transactionTime: string;
  timezone: string;
  description: string;
  currency: string;
  brutto: number;
  fee: number;
  netto: number;
  credit: number;
  payeeEmail: string;
  name: string;
  bankName: string;
  bankAccount: string;
  processingAndShippingFee: number;
  vatAmount: number;
  invoiceNumber: string;
  linkedTransactionCode: string;
}