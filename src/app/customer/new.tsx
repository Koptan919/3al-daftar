import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { Button, Field } from '@/components/ui';
import { addCustomer, getCustomer, updateCustomer } from '@/db/repo';

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
      setError('لازم تكتب اسم الزبون');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateCustomer(db, editId, { name, phone, note });
        router.back();
      } else {
        const id = await addCustomer(db, { name, phone, note });
        router.replace({ pathname: '/customer/[id]', params: { id: String(id) } });
      }
    } catch (e) {
      Alert.alert('صار في خطأ', String(e));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editId ? 'تعديل الزبون' : 'زبون جديد' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
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
        />
        <Field label="ملاحظة" value={note} onChangeText={setNote} placeholder="اختياري" multiline />
        <Button title={editId ? 'حفظ التعديل' : 'حفظ الزبون'} onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
