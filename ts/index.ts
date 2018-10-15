import * as plugins from './csv-paypal.plugins';

export interface IPayPalTransaction {
  Datum: Date;
  Uhrzeit: string;
  Zeitzone: string;
  Beschreibung: string;
  Währung: string;
  Brutto: number;
  Gebühr: number;
  Netto: number;
  Guthaben: number;
  Transaktionscode: string;
  'Absender E-Mail-Adresse': string;
  Name: string;
  'Name der Bank': string;
  Bankkonto: string;
  'Versand- und Bearbeitungsgebühr': number;
  Umsatzsteuer: number;
  Rechnungsnummer: string;
  'Zugehöriger Transaktionscode': string;
}

export class CsvPayPal {
  public static async fromString(csvStringArg: string) {
    const csvPayPalInstance = new CsvPayPal(csvStringArg);
    return csvPayPalInstance;
  }

  public static async fromFile(filePath: string) {
    const fileString = plugins.smartfile.fs.toStringSync(filePath);
    const csvPayPalInstance = new CsvPayPal(fileString);
    return csvPayPalInstance;
  }

  public static async fromDirectory(dirPathArg: string) {
    const smartfileArray = await plugins.smartfile.fs.fileTreeToObject(dirPathArg, '**/*.CSV');
    const csvPayPalArray: CsvPayPal[] = [];
    for (const smartfile of smartfileArray) {
      const csvPayPalInstance = await CsvPayPal.fromString(smartfile.contentBuffer.toString());
      await csvPayPalInstance.parse();
      csvPayPalArray.push(csvPayPalInstance);
    }
    let finalCsvPayPalInstance = new CsvPayPal('');
    for (let csvPayPalInstance of csvPayPalArray) {
      finalCsvPayPalInstance = await finalCsvPayPalInstance.concat(csvPayPalInstance);
    }

    return finalCsvPayPalInstance;
  }

  public transactions = [];

  constructor(private csvString: string) {}

  public async parse() {
    let stringToParse = this.csvString;
    stringToParse = stringToParse.replace(/"(.*?)"/gi, (match, p1, offset, string) => {
      return plugins.smartstring.base64.encodeUri(match);
    });
    const smartCsvInstance = new plugins.smartcsv.Csv(stringToParse, {
      headers: true
    });
    const parsedArrayObject = await smartCsvInstance.exportAsObject();
    const finalParsedArray: any = [];
    for (const transaction of parsedArrayObject) {
      const decodedTransaction: any = {};
      for (const key in transaction) {
        if (transaction[key]) {
          let finalKey = plugins.smartstring.base64.decode(key);
          finalKey = finalKey.replace(/['"]+/g, '');
          let finalValue = plugins.smartstring.base64.decode(transaction[key]);
          finalValue = finalValue.replace(/['"]+/g, '');
          decodedTransaction[finalKey] = finalValue;
        }
      }
      const typeAdjustedTransaction: any = decodedTransaction;
      typeAdjustedTransaction.Datum = new Date(typeAdjustedTransaction.Datum);
      finalParsedArray.push(typeAdjustedTransaction);
    }
    this.transactions = finalParsedArray;
  }

  /**
   * concatenates multiple PayPalCsvInstances
   * @param args
   */
  public async concat(...args: CsvPayPal[]) {
    let accumulatedTransactions = this.transactions;
    for (const csvPayPalIstance of args) {
      await csvPayPalIstance.parse();
      accumulatedTransactions = accumulatedTransactions.concat(csvPayPalIstance.transactions);
    }
    const returnInstance = new CsvPayPal('');
    returnInstance.transactions = accumulatedTransactions;
    return returnInstance;
  }
}
