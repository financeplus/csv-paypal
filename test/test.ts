import { expect, tap } from '@pushrocks/tapbundle';

import * as csvPaypal from '../ts/index';

tap.test('first test', async () => {
  const testPayPalCsv = await csvPaypal.CsvPayPal.fromDirectory('./.nogit/');
  console.log(testPayPalCsv.transactions);
});

tap.start();
