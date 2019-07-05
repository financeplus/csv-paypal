import * as plugins from './csv-paypal.plugins';

import * as interfaces from './interfaces';

export class CsvPayPal {
  // STATIC
  public static async fromString(csvStringArg: string) {
    let stringToParse = csvStringArg;
    stringToParse = stringToParse.replace(/"(.*?)"/gi, (match, p1, offset, originalString) => {
      return plugins.smartstring.base64.encodeUri(match);
    });
    const smartCsvInstance = new plugins.smartcsv.Csv(stringToParse, {
      headers: true
    });
    const originalTransactionArray: interfaces.IPayPalCsvOriginalTransaction[] = (await smartCsvInstance.exportAsObject()).map(
      originalTransaction => {
        // tslint:disable-next-line: no-object-literal-type-assertion
        const decodedTransaction = {} as interfaces.IPayPalCsvOriginalTransaction;
        for (const key in originalTransaction) {
          if (originalTransaction[key]) {
            let finalKey = plugins.smartstring.base64.decode(key);
            finalKey = finalKey.replace(/['"]+/g, '');
            let finalValue = plugins.smartstring.base64.decode(originalTransaction[key]);
            finalValue = finalValue.replace(/['"]+/g, '');
            decodedTransaction[finalKey] = finalValue;
          }
        }
        // pushing the ready transaction
        return decodedTransaction;
      }
    );

    // adjust numberFormat
    const anf = (numberString: string): number => {
      return parseFloat(numberString.replace(/\,/g, '.'));
    };

    const paypalTransactions: interfaces.IPayPalTransaction[] = [];
    for (const originalTransaction of originalTransactionArray) {
      const paypalTransaction: interfaces.IPayPalTransaction = {
        transactionDate: plugins.smarttime.ExtendedDate.fromEuropeanDateAndTime(
          originalTransaction.Datum,
          originalTransaction.Uhrzeit,
          'Europe/Berlin'
        ),
        transactionCode: originalTransaction.Transaktionscode,
        linkedTransactionCode: originalTransaction["Zugehöriger Transaktionscode"],
        timezone: originalTransaction.Zeitzone,
        bankAccount: originalTransaction.Bankkonto,
        bankName: originalTransaction["Name der Bank"],
        brutto: anf(originalTransaction.Brutto),
        netto: anf(originalTransaction.Netto),
        credit: anf(originalTransaction.Guthaben),
        fee: anf(originalTransaction.Gebühr),
        processingAndShippingFee: anf(originalTransaction["Versand- und Bearbeitungsgebühr"]),
        currency: originalTransaction.Währung,
        description: originalTransaction.Beschreibung,
        invoiceNumber: originalTransaction.Rechnungsnummer,
        name: originalTransaction.Name,
        payeeEmail: originalTransaction["Absender E-Mail-Adresse"],
        transactionTime: originalTransaction.Uhrzeit,
        vatAmount: anf(originalTransaction.Umsatzsteuer)
      };
    
      paypalTransactions.push(paypalTransaction);
    }


    const foreignTransactions: interfaces.IPayPalTransaction[] = [];
    const eurTransactions: interfaces.IPayPalTransaction[] = paypalTransactions.filter(
      (payPalTransaction: interfaces.IPayPalTransaction) => {
        const isEur = payPalTransaction.currency === 'EUR';
        if (isEur) {
          return true;
        } else {
          foreignTransactions.push(payPalTransaction);
          return false;
        }
      }
    );
    const foreignAdjustedPayPalTransactions = eurTransactions.map(transaction => {
      if (transaction.brutto > 0) {
        return transaction; // lets don't bother with payments from the bank
      }
      const eurTime = transaction.transactionDate.getTime();
      const foreignCandidates: interfaces.IPayPalTransaction[] = [];
      for (const foreignTransaction of foreignTransactions) {
        const foreignTime = foreignTransaction.transactionDate.getTime();
        if (eurTime === foreignTime) {
          foreignCandidates.push(foreignTransaction);
        }
      }

      if (foreignCandidates.length !== 2 && foreignCandidates.length !== 0) {
        console.log('error! Found a weird amoun of corresponding foreign transactions');
      }

      if (foreignCandidates.length === 2) {
        const wantedForeignTransaction = foreignCandidates.find(foreignTransaction => {
          return foreignTransaction.brutto < 0;
        });
        transaction.description = wantedForeignTransaction.description;
        transaction.payeeEmail =
          wantedForeignTransaction.payeeEmail;
        transaction.name = wantedForeignTransaction.name;
      }

      return transaction;
    });

    const csvPayPalInstance = new CsvPayPal(foreignAdjustedPayPalTransactions);
    return csvPayPalInstance;
  }

  public static async fromFile(filePath: string): Promise<CsvPayPal> {
    const fileString = plugins.smartfile.fs.toStringSync(filePath);
    const csvPayPalInstance = await CsvPayPal.fromString(fileString);
    return csvPayPalInstance;
  }

  public static async fromDirectory(dirPathArg: string) {
    const smartfileArray = await plugins.smartfile.fs.fileTreeToObject(dirPathArg, '**/MSR*.CSV');
    const csvPayPalArray: CsvPayPal[] = [];
    for (const smartfile of smartfileArray) {
      const csvPayPalInstance = await CsvPayPal.fromString(smartfile.contentBuffer.toString());
      csvPayPalArray.push(csvPayPalInstance);
    }
    let finalCsvPayPalInstance = new CsvPayPal([]);
    for (const csvPayPalInstance of csvPayPalArray) {
      finalCsvPayPalInstance = await finalCsvPayPalInstance.concat(csvPayPalInstance);
    }

    return finalCsvPayPalInstance;
  }

  // INSTANCE
  public transactionArray: interfaces.IPayPalTransaction[] = [];

  constructor(transactionsArrayArg: interfaces.IPayPalTransaction[]) {
    this.transactionArray = transactionsArrayArg;
  }

  /**
   * concatenates multiple PayPalCsvInstances
   * @param args
   */
  public async concat(...args: CsvPayPal[]) {
    for (const csvPayPalIstance of args) {
      this.transactionArray = this.transactionArray.concat(csvPayPalIstance.transactionArray);
    }
    return this;
  }
}
