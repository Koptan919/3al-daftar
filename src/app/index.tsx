import { router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceInline, ConvertedHint } from '@/components/BalanceView';
import { Button, Card, family, T } from '@/components/ui';
import { UpdateBanner } from '@/components/UpdateBanner';
import { listCustomersWithBalances, type CustomerWithBalance } from '@/db/repo';
import { formatMoney, totalReceivable } from '@/lib/money';
import { matchesCustomer } from '@/lib/search';
import { useSettings } from '@/state/settings';
import { fx, FONT, RADIUS } from '@/theme/colors';

type Filter = 'all' | 'owing';

export default function Home() {
  const db = useSQLiteContext();
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      listCustomersWithBalances(db).then(setCustomers);
    }, [db]),
  );

  const total = useMemo(() => totalReceivable(customers.map((c) => c.balance)), [customers]);
  const owingCount = useMemo(
    () => customers.filter((c) => c.balance.LBP > 0 || c.balance.USD > 0).length,
    [customers],
  );

  const visible = useMemo(
    () =>
      customers.filter(
        (c) =>
          matchesCustomer(query, c) && (filter === 'all' || c.balance.LBP > 0 || c.balance.USD > 0),
      ),
    [customers, query, filter],
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityLabel="الإعدادات"
              hitSlop={16}
              onPress={() => router.push('/settings')}
              style={{ padding: 6 }}
            >
              <T size="title" color={colors.titanium}>⚙︎</T>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={visible}
        keyExtractor={(c) => String(c.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 + insets.bottom }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <UpdateBanner />
            <Card style={{ backgroundColor: 'rgba(110,23,48,0.22)', borderColor: 'rgba(232,130,159,0.22)' }}>
              <T muted bold>
                مجموع الديون على الزبائن
              </T>
              <T size="huge" heavy color={colors.debt}>
                {formatMoney(total.USD, 'USD')}
              </T>
              <T size="title" heavy color={colors.debt}>
                {formatMoney(total.LBP, 'LBP')}
              </T>
              <ConvertedHint balance={total} />
              <T size="small" muted>
                {owingCount} زبون عليهم دين من أصل {customers.length}
              </T>
            </Card>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="🔍  دوّر بالاسم أو الرقم"
              placeholderTextColor="#767a84"
              selectionColor={colors.debt}
              style={[styles.search, family('medium'), { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="الكل" active={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label="عليهم دين" active={filter === 'owing'} onPress={() => setFilter('owing')} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
            <T size="large" muted>
              {customers.length === 0 ? 'الدفتر فاضي' : 'ما في نتيجة'}
            </T>
            {customers.length === 0 && (
              <T muted>كبوس «زبون جديد» لتبلّش</T>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/customer/[id]', params: { id: String(item.id) } })}
            style={({ pressed }) => [
              styles.item,
              { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <T size="large" bold numberOfLines={1}>
                {item.name}
              </T>
              {!!item.phone && (
                <T size="small" muted>
                  {item.phone}
                </T>
              )}
            </View>
            <BalanceInline balance={item.balance} />
          </Pressable>
        )}
      />
      <View style={[styles.fabWrap, { paddingBottom: 16 + insets.bottom, backgroundColor: colors.header }]}>
        <Button title="زبون جديد" icon="＋" onPress={() => router.push('/customer/new')} />
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundImage: fx.burg, borderColor: fx.burgBorder, boxShadow: fx.burgShadow }
          : { backgroundColor: colors.surfaceAlt, borderColor: colors.border, boxShadow: fx.btnShadow },
      ]}
    >
      <T bold color={active ? '#ffffff' : colors.textMuted}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: RADIUS.button,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    fontSize: FONT.large,
    writingDirection: 'rtl',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundImage: fx.glass,
    boxShadow: fx.cardShadow,
    minHeight: 76,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
