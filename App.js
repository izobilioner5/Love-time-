import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const LOVE_ACTIONS = [
  'Напиши близкому человеку: «Я тебя ценю» ❤️',
  'Позвони тому, кому давно хотел позвонить.',
  'Обними человека рядом минимум на 20 секунд.',
  'Сделай сегодня одно доброе дело тайно.',
  'Скажи искренний комплимент без повода.',
];

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [action, setAction] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setEnabled(globalThis.localStorage?.getItem('loveTimeEnabled') === 'true');
      return;
    }

    Notifications.getAllScheduledNotificationsAsync()
      .then((items) => {
        setEnabled(items.some((item) => item.content?.data?.loveTime === true));
      })
      .catch(() => setEnabled(false));
  }, []);

  const showMessage = (title, message) => {
    if (Platform.OS === 'web') {
      globalThis.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const toggleLoveTime = async (value) => {
    if (Platform.OS === 'web') {
      setEnabled(value);
      globalThis.localStorage?.setItem('loveTimeEnabled', String(value));
      showMessage(
        value ? 'Love Time включён ❤️' : 'Love Time выключен',
        value
          ? 'Напоминание включено в этой версии MVP.'
          : 'Напоминание отключено.'
      );
      return;
    }

    try {
      if (!value) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
          scheduled
            .filter((item) => item.content?.data?.loveTime === true)
            .map((item) =>
              Notifications.cancelScheduledNotificationAsync(item.identifier)
            )
        );
        setEnabled(false);
        return;
      }

      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showMessage(
          'Разреши уведомления ❤️',
          'Love Time нужен доступ к уведомлениям.'
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Love Time ❤️',
          body: 'Сейчас время проявить любовь. Кому ты можешь её дать?',
          data: { loveTime: true },
          sound: true,
        },
        trigger: { seconds: 10 },
      });

      setEnabled(true);
      showMessage(
        'Love Time включён ❤️',
        'Тестовое уведомление придёт через 10 секунд. Сверни приложение.'
      );
    } catch {
      showMessage('Не получилось включить', 'Попробуй ещё раз.');
    }
  };

  const chooseLoveAction = () => {
    const next = LOVE_ACTIONS[Math.floor(Math.random() * LOVE_ACTIONS.length)];
    setAction(next);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.heart}>❤️</Text>
        <Text style={styles.title}>Love Time</Text>
        <Text style={styles.subtitle}>Время любить</Text>

        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>Напоминать мне</Text>
            <Text style={styles.hint}>проявлять любовь каждый день</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleLoveTime}
            trackColor={{ false: '#A0A0A0', true: '#FF7185' }}
          />
        </View>

        <Text style={styles.status}>
          {enabled ? '❤️ Love Time включён' : 'Включи Love Time'}
        </Text>

        <Pressable
          onPress={chooseLoveAction}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Проявить любовь сейчас</Text>
        </Pressable>

        {action ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#FFF7F8',
    justifyContent: 'center',
    padding: 24,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 30, padding: 30 },
  heart: { fontSize: 70, textAlign: 'center' },
  title: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 8,
    color: '#777',
  },
  row: {
    marginTop: 36,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFF0F2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copy: { flex: 1, paddingRight: 12 },
  label: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, color: '#777', marginTop: 4 },
  status: { textAlign: 'center', marginTop: 24, fontSize: 17 },
  button: {
    marginTop: 22,
    backgroundColor: '#E9435C',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  buttonPressed: { opacity: 0.75 },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  actionCard: {
    marginTop: 16,
    backgroundColor: '#FFF0F2',
    borderRadius: 18,
    padding: 18,
  },
  actionText: {
    color: '#5B2630',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 23,
  },
});
