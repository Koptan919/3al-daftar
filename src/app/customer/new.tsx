import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassScreen, useGlassTop } from '@/components/Glass';
import { UserPlus } from '@/components/icons';
import { Button, Field } from '@/components/ui';
import { addCustomer, getCustomer, updateCustomer } from '@/db/repo';
import { haptic } from '@/lib/haptics';
import { notify } from '@/lib/notify';

/** إضافة زبون جديد، أو تعديل زبون إذا انبعت id */
export default function CustomerForm() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const top = useGlassTop();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!editId) return;
    getCustomer(db, editId).then((c) => {
      if (!c) return;
      setName(c.name);
      setPhone(c.phone);
      setNote(c.note);
    });
  }, [db, editId]);

  async function save() {
    if (!name.trim()) {
      haptic.error();
      setError('لازم تكتب اسم الزبون');
      return;
    }
    setSaving(true);
    try {
      haptic.success();
      if (editId) {
        await updateCustomer(db, editId, { name, phone, note });
        router.back();
      } else {
        const id = await addCustomer(db, { name, phone, note });
        router.replace({ pathname: '/customer/[id]', params: { id: String(id) } });
      }
    } catch (e) {
      notify('صار في خطأ', String(e));
      setSaving(false);
    }
  }

  return (
    <GlassScreen title={editId ? 'تعديل الزبون' : 'زبون جديد'}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: top + 16, gap: 16, paddingBottom: 32 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Field
          label="الاسم *"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          error={error}
          placeholder="مثلاً: أبو علي"
          autoFocus={!editId}
          returnKeyType="next"
        />
        <Field
          label="رقم التلفون"
          value={phone}
          onChangeText={setPhone}
          placeholder="03 123 456"
          keyboardType="phone-pad"
          // الرقم بينكتب من الشمال لليمين حتى ما ينقلب ترتيب المجموعات
          style={{ direction: 'ltr', textAlign: 'right' }}
        />
        <Field label="ملاحظة" value={note} onChangeText={setNote} placeholder="اختياري" multiline />
        <Button title={editId ? 'حفظ التعديل' : 'حفظ الزبون'} icon={editId ? undefined : UserPlus} onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
    </GlassScreen>
  );
}
