import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConvertedHint } from '@/components/BalanceView';
import { CustomerActions } from '@/components/CustomerActions';
import { Button, Card, Row, T } from '@/components/ui';
import { deleteCustomer, deleteTransaction, getCustomer, listTransactions, type Customer, type Transaction } from '@/db/repo';
import { friendlyDate } from '@/lib/date';
import { computeBalance, formatMoney, isZeroBalance } from '@/lib/money';
import { useSettings } from '@/state/settings';
import { fx, RADIUS } from '@/theme/colors';

export default function CustomerScreen() {
  const db = useSQLiteContext();
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([getCustomer(db, id), listTransactions(db, id)]);
    setCustomer(c);
    setTxs(t);
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const balance = useMemo(() => computeBalance(txs), [txs]);

  function confirmDeleteTx(tx: Transaction) {
    Alert.alert(
      'حذف الحركة؟',
      `${tx.type === 'debt' ? 'دين' : 'دفعة'} ${formatMoney(tx.amount, tx.currency)} — ${friendlyDate(tx.date)}`,
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'احذف',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(db, tx.id);
            load();
          },
        },
      ],
    );
  }

  function confirmDeleteCustomer() {
    if (!customer) return;
    Alert.alert('حذف الزبون؟', `رح ينمحى «${customer.name}» مع كل حركاتو. ما فيك ترجّعن.`, [
      { text: 'لا', style: 'cancel' },
      {
        text: 'احذف',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomer(db, id);
          router.back();
        },
      },
    ]);
  }

  if (!customer) return null;

  const balanceLine = (amount: number, currency: 'USD' | 'LBP') => {
    const color = amount > 0 ? colors.debt : amount < 0 ? colors.payment : colors.textMuted;
    const label = amount > 0 ? 'عليه' : amount < 0 ? 'إلو' : 'خالص';
    return (
      <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
        <T size="small" muted bold>
          {currency === 'USD' ? 'بالدولار' : 'بالليرة'} · {label}
        </T>
        <T size="title" heavy color={color}>
          {formatMoney(Math.abs(amount), currency)}
        </T>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: customer.name,
          headerRight: () => (
            <Pressable
              hitSlop={14}
              onPress={() => router.push({ pathname: '/customer/new', params: { id: String(id) } })}
            >
              <T bold color={colors.debt}>
                تعديل
              </T>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={txs}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 110 + insets.bottom }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 6 }}>
            <Card>
              <Row>
                {balanceLine(balance.USD, 'USD')}
                <View style={{ width: 1, backgroundColor: colors.border }} />
                {balanceLine(balance.LBP, 'LBP')}
              </Row>
              {!isZeroBalance(balance) && (
                <View style={{ alignItems: 'center' }}>
                  <ConvertedHint balance={balance} />
                </View>
              )}
              {!!customer.phone && (
                <T muted>📞 {customer.phone}</T>
              )}
              {!!customer.note && <T muted>📝 {customer.note}</T>}
            </Card>

            <CustomerActions customer={customer} balance={balance} transactions={txs} />

            <T size="large" bold title style={{ marginTop: 6 }}>
              الحركات ({txs.length})
            </T>
            {txs.length > 0 && (
              <T size="small" muted>
                كبسة طويلة على أي حركة لتحذفها
              </T>
            )}
          </View>
        }
        ListEmptyComponent={
          <T muted style={{ textAlign: 'center', padding: 24 }}>
            ما في حركات بعد
          </T>
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => confirmDeleteTx(item)}
            style={[
              styles.tx,
              item.type === 'debt'
                ? { backgroundColor: colors.debtSoft, borderColor: 'rgba(232,130,159,0.22)' }
                : { backgroundColor: colors.paymentSoft, borderColor: 'rgba(66,210,147,0.25)' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <T bold>{item.type === 'debt' ? 'دين' : 'دفعة'}</T>
              <T size="small" muted>
                {friendlyDate(item.date)}
                {item.note ? ` · ${item.note}` : ''}
              </T>
            </View>
            <T size="large" heavy color={item.type === 'debt' ? colors.debt : colors.payment}>
              {item.type === 'debt' ? '+' : '−'} {formatMoney(item.amount, item.currency)}
            </T>
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable onPress={confirmDeleteCustomer} style={{ padding: 20, alignItems: 'center' }}>
            <T color={colors.danger}>حذف الزبون</T>
          </Pressable>
        }
      />
      <View style={[styles.bottom, { paddingBottom: 14 + insets.bottom, backgroundColor: colors.header }]}>
        <Button
          title="دين جديد"
          variant="debt"
          icon="＋"
          style={{ flex: 1 }}
          onPress={() =>
            router.push({ pathname: '/transaction/new', params: { customerId: String(id), type: 'debt' } })
          }
        />
        <Button
          title="دفعة"
          variant="payment"
          icon="−"
          style={{ flex: 1 }}
          onPress={() =>
            router.push({ pathname: '/transaction/new', params: { customerId: String(id), type: 'payment' } })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    boxShadow: fx.btnShadow,
    gap: 10,
    minHeight: 64,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
