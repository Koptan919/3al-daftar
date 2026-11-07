import { View } from 'react-native';

import { T } from '@/components/ui';
import { convertBalance, formatMoney, isZeroBalance, type Balance } from '@/lib/money';
import { useSettings } from '@/state/settings';

/** سطر رصيد مختصر للائحة الزبائن */
export function BalanceInline({ balance }: { balance: Balance }) {
  const { colors } = useSettings();
  if (isZeroBalance(balance)) {
    return (
      <T size="small" muted>
        خالص ✓
      </T>
    );
  }
  return (
    <View style={{ alignItems: 'flex-end' }}>
      {balance.USD !== 0 && (
        <T bold color={balance.USD > 0 ? colors.debt : colors.payment}>
          {formatMoney(balance.USD, 'USD')}
        </T>
      )}
      {balance.LBP !== 0 && (
        <T bold color={balance.LBP > 0 ? colors.debt : colors.payment}>
          {formatMoney(balance.LBP, 'LBP')}
        </T>
      )}
    </View>
  );
}

/** المجموع المحوّل لعملة وحدة (للمرجع بس) */
export function ConvertedHint({ balance }: { balance: Balance }) {
  const { exchangeRate, referenceCurrency } = useSettings();
  if (!exchangeRate) return null;
  const converted = convertBalance(balance, exchangeRate, referenceCurrency);
  if (converted == null) return null;
  return (
    <T size="small" muted>
      ≈ {formatMoney(converted, referenceCurrency)} بالمجموع (على سعر {formatMoney(exchangeRate, 'LBP')} للدولار)
    </T>
  );
}
