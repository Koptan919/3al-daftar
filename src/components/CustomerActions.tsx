import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Linking, Share } from 'react-native';

import { Button, Row } from '@/components/ui';
import type { Customer, Transaction } from '@/db/repo';
import type { Balance } from '@/lib/money';
import { statementHtml, statementText, type StatementInput } from '@/lib/statement';
import { reminderMessage, whatsappUrl } from '@/lib/whatsapp';
import { useSettings } from '@/state/settings';

export function CustomerActions({
  customer,
  balance,
  transactions,
}: {
  customer: Customer;
  balance: Balance;
  transactions: Transaction[];
}) {
  const settings = useSettings();
  const [pdfBusy, setPdfBusy] = useState(false);
  const owes = balance.LBP > 0 || balance.USD > 0;

  const statementInput = (): StatementInput => ({
    shopName: settings.shopName,
    customerName: customer.name,
    phone: customer.phone,
    transactions,
    exchangeRate: settings.exchangeRate,
    referenceCurrency: settings.referenceCurrency,
  });

  async function remind() {
    const url = whatsappUrl(customer.phone, reminderMessage(customer.name, balance, settings.shopName));
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('ما قدرنا نفتح واتساب', 'تأكد إنو واتساب منزّل عالتلفون.');
    }
  }

  async function shareText() {
    await Share.share({ message: statementText(statementInput()) });
  }

  async function sharePdf() {
    setPdfBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: statementHtml(statementInput()) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `كشف حساب ${customer.name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('المشاركة مش متاحة على هالجهاز');
      }
    } catch (e) {
      Alert.alert('ما زبط عمل الـ PDF', String(e));
    } finally {
      setPdfBusy(false);
    }
  }

  function chooseStatement() {
    Alert.alert('كشف حساب', 'كيف بدك تبعتو؟', [
      { text: 'نص', onPress: shareText },
      { text: 'PDF', onPress: sharePdf },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  }

  return (
    <Row>
      <Button
        title="تذكير واتساب"
        variant="whatsapp"
        onPress={remind}
        disabled={!owes}
        style={{ flex: 1 }}
      />
      <Button
        title="كشف حساب"
        variant="secondary"
        onPress={chooseStatement}
        loading={pdfBusy}
        style={{ flex: 1 }}
      />
    </Row>
  );
}
