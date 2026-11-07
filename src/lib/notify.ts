import { Alert } from 'react-native';

/** رسالة بسيطة بزر عربي («تمام») بدل «OK» تبع النظام */
export function notify(title: string, message?: string): void {
  Alert.alert(title, message, [{ text: 'تمام' }]);
}
