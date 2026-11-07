import { ScrollView } from 'react-native';

import { T } from '@/components/ui';

export default function Settings() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <T muted>الإعدادات</T>
    </ScrollView>
  );
}
