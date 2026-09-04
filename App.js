import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    Notifications.getAllScheduledNotificationsAsync().then((items) => {
      setEnabled(items.some((item) => item.content?.data?.loveTime === true));
    });
  }, []);

  const toggleLoveTime = async (value) => {
    if (!value) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((item) => item.content?.data?.loveTime === true)
          .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
      );
      setEnabled(false);
      return;
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Разреши уведомления ❤️', 'Love Time нужен доступ к уведомлениям.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Love Time ❤️',
        body: 'Время любить. Прояви любовь прямо сейчас.',
        data: { loveTime: true },
        sound: true,
      },
      trigger: { seconds: 10 },
    });

    setEnabled(true);
    Alert.alert('Love Time включён ❤️', 'Тестовое уведомление придёт через 10 секунд. Сверни приложение.');
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
          <Switch value={enabled} onValueChange={toggleLoveTime} />
        </View>

        <Text style={styles.footer}>{enabled ? '❤️ Love Time включён' : 'Включи Love Time'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF7F8', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 30, padding: 30 },
  heart: { fontSize: 70, textAlign: 'center' },
  title: { fontSize: 40, fontWeight: '800', textAlign: 'center', marginTop: 15 },
  subtitle: { fontSize: 20, textAlign: 'center', marginTop: 8, color: '#777' },
  row: { marginTop: 45, padding: 20, borderRadius: 20, backgroundColor: '#FFF0F2', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copy: { flex: 1, paddingRight: 12 },
  label: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, color: '#777', marginTop: 4 },
  footer: { textAlign: 'center', marginTop: 30, fontSize: 17 },
});
