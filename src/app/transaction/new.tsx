import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassScreen, useGlassTop } from '@/components/Glass';
import { CalendarDays, ICON, Minus, Plus } from '@/components/icons';
import { Button, Card, Field, family, Row, Segmented, T } from '@/components/ui';
import { addTransaction, getCustomer } from '@/db/repo';
import { friendlyDate, isValidISODate, shiftDate, todayISO } from '@/lib/date';
import { formatMoney, parseAmount, type Currency, type TxType } from '@/lib/money';
import { useSettings } from '@/state/settings';
import { notify } from '@/lib/notify';

export default function NewTransaction() {
  const db = useSQLiteContext();
  const { colors } = useSettings();
  const params = useLocalSearchParams<{ customerId: string; type?: string }>();
  const customerId = Number(params.customerId);
  const [type, setType] = useState<TxType>(params.type === 'payment' ? 'payment' : 'debt');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const top = useGlassTop();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getCustomer(db, customerId).then((c) => setCustomerName(c?.name ?? ''));
  }, [db, customerId]);

  const amount = parseAmount(amountText, currency);
  const accent = type === 'debt' ? colors.debt : colors.payment;

  async function save() {
    if (amount == null) {
      setError('اكتب مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!isValidISODate(date)) {
      notify('التاريخ غلط', 'اكتب التاريخ هيك: 2026-11-07');
      return;
    }
    setSaving(true);
    try {
      await addTransaction(db, { customer_id: customerId, type, amount, currency, date, note });
      router.back();
    } catch (e) {
      notify('صار في خطأ', String(e));
      setSaving(false);
    }
  }

  return (
    <GlassScreen title={type === 'debt' ? 'دين جديد' : 'دفعة'}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: top + 16, gap: 18, paddingBottom: 32 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {!!customerName && (
          <T size="large" bold>
            {customerName}
          </T>
        )}

        <Segmented<TxType>
          options={[
            { value: 'debt', label: 'دين جديد (عليه)' },
            { value: 'payment', label: 'دفعة (دفع)' },
          ]}
          value={type}
          onChange={setType}
        />

        <View style={{ gap: 6 }}>
          <T size="small" muted bold>
            العملة
          </T>
          <Segmented<Currency>
            options={[
              { value: 'USD', label: 'دولار $' },
              { value: 'LBP', label: 'ليرة ل.ل' },
            ]}
            value={currency}
            onChange={(c) => {
              setCurrency(c);
              setError(null);
            }}
          />
        </View>

        <Field
          label="المبلغ"
          value={amountText}
          onChangeText={(t) => {
            setAmountText(t);
            setError(null);
          }}
          error={error}
          keyboardType="decimal-pad"
          placeholder={currency === 'USD' ? '0.00' : '0'}
          autoFocus
          style={[{ fontSize: 30, color: accent }, family('heavy')]}
        />
        {amount != null && (
          <T muted>
            = {formatMoney(amount, currency)}
          </T>
        )}

        <Card>
          <Row style={{ alignItems: 'center', gap: 8 }}>
            <CalendarDays size={18} strokeWidth={ICON.strokeWidth} color={colors.textMuted} />
            <T size="small" muted bold>
              التاريخ
            </T>
          </Row>
          <Row style={{ alignItems: 'center' }}>
            <Button
              title="قبل"
              variant="secondary"
              onPress={() => setDate((d) => (isValidISODate(d) ? shiftDate(d, -1) : todayISO()))}
              style={{ flex: 1 }}
            />
            <View style={{ flex: 2, alignItems: 'center' }}>
              <T size="large" bold>
                {isValidISODate(date) ? friendlyDate(date) : date}
              </T>
            </View>
            <Button
              title="بعد"
              variant="secondary"
              onPress={() => setDate((d) => (isValidISODate(d) ? shiftDate(d, 1) : todayISO()))}
              style={{ flex: 1 }}
            />
          </Row>
          <Field label="أو اكتب التاريخ (سنة-شهر-يوم)" value={date} onChangeText={setDate} />
        </Card>

        <Field label="ملاحظة" value={note} onChangeText={setNote} placeholder="مثلاً: غراض البيت" multiline />

        <Button
          title={type === 'debt' ? 'سجّل الدين' : 'سجّل الدفعة'}
          variant={type}
          icon={type === 'debt' ? Plus : Minus}
          onPress={save}
          loading={saving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
    </GlassScreen>
  );
}
