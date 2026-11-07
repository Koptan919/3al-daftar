import { View } from 'react-native';

import { Check } from '@/components/icons';
import { T } from '@/components/ui';
import { convertBalance, formatMoney, isZeroBalance, type Balance } from '@/lib/money';
import { useSettings } from '@/state/settings';

/** سطر رصيد مختصر للائحة الزبائن */
export function BalanceInline({ balance }: { balance: Balance }) {
  const { colors } = useSettings();
  if (isZeroBalance(balance)) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Check size={16} strokeWidth={2} color={colors.payment} />
        <T size="small" muted>
          خالص
        </T>
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'flex-end' }}>
      {balance.USD !== 0 && (
        <T heavy color={balance.USD > 0 ? colors.debt : colors.payment}>
          {formatMoney(balance.USD, 'USD')}
        </T>
      )}
      {balance.LBP !== 0 && (
        <T heavy color={balance.LBP > 0 ? colors.debt : colors.payment}>
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
