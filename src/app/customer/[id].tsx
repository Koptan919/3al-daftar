import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConvertedHint } from '@/components/BalanceView';
import { CustomerActions } from '@/components/CustomerActions';
import { GlassScreen, useGlassTop } from '@/components/Glass';
import { ICON, Minus, Pencil, Phone, Plus, StickyNote } from '@/components/icons';
import { Button, Card, IconBox, Row, T } from '@/components/ui';
import { deleteCustomer, deleteTransaction, getCustomer, listTransactions, type Customer, type Transaction } from '@/db/repo';
import { ltr } from '@/lib/bidi';
import { haptic } from '@/lib/haptics';
import { friendlyDate } from '@/lib/date';
import { computeBalance, formatMoney, isZeroBalance } from '@/lib/money';
import { useSettings } from '@/state/settings';
import { fx, RADIUS } from '@/theme/colors';

export default function CustomerScreen() {
  const db = useSQLiteContext();
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const top = useGlassTop();
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
    haptic.long();
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
            haptic.success();
            load();
          },
        },
      ],
    );
  }

  function confirmDeleteCustomer() {
    if (!customer) return;
    haptic.warning();
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
    <GlassScreen
      title={customer.name}
      right={
        <Pressable
          accessibilityLabel="تعديل"
          hitSlop={12}
          onPress={() => {
            haptic.tap();
            router.push({ pathname: '/customer/new', params: { id: String(id) } });
          }}
          style={styles.iconBtn}
        >
          <Pencil size={20} strokeWidth={ICON.strokeWidth} color={colors.titanium} />
        </Pressable>
      }
      bottom={
        <>
          <Button
            title="دين جديد"
            variant="debt"
            icon={Plus}
            style={{ flex: 1 }}
            onPress={() =>
              router.push({ pathname: '/transaction/new', params: { customerId: String(id), type: 'debt' } })
            }
          />
          <Button
            title="دفعة"
            variant="payment"
            icon={Minus}
            style={{ flex: 1 }}
            onPress={() =>
              router.push({ pathname: '/transaction/new', params: { customerId: String(id), type: 'payment' } })
            }
          />
        </>
      }
    >
      <FlatList
        data={txs}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 16, paddingTop: top + 16, gap: 8, paddingBottom: 110 + insets.bottom }}
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
                <Row style={{ alignItems: 'center' }}>
                  <Phone size={18} strokeWidth={ICON.strokeWidth} color={colors.textMuted} />
                  <T muted>{ltr(customer.phone)}</T>
                </Row>
              )}
              {!!customer.note && (
                <Row style={{ alignItems: 'center' }}>
                  <StickyNote size={18} strokeWidth={ICON.strokeWidth} color={colors.textMuted} />
                  <T muted>{customer.note}</T>
                </Row>
              )}
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
          <Pressable onLongPress={() => confirmDeleteTx(item)} style={styles.tx}>
            <IconBox kind={item.type === 'debt' ? 'r' : 'g'} icon={item.type === 'debt' ? Plus : Minus} />
            <View style={{ flex: 1 }}>
              <T bold>{item.type === 'debt' ? 'دين' : 'دفعة'}</T>
              <T size="small" muted>
                {friendlyDate(item.date)}
                {item.note ? ` · ${item.note}` : ''}
              </T>
            </View>
            <T size="large" heavy color={item.type === 'debt' ? colors.debt : colors.payment}>
              {formatMoney(item.amount, item.currency)}
            </T>
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable onPress={confirmDeleteCustomer} style={{ padding: 20, alignItems: 'center' }}>
            <T color={colors.danger}>حذف الزبون</T>
          </Pressable>
        }
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundImage: fx.glass,
    boxShadow: fx.cardShadow,
    gap: 12,
    minHeight: 68,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
