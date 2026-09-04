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
      Alert.alert('Нужны уведомления', 'Разреши уведомления, чтобы Love Time мог напоминать тебе проявлять любовь.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Love Time ❤️',
        body: 'Сейчас время проявить любовь. Кому ты можешь её дать?',
        data: { loveTime: true },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 0,
      },
    });

    setEnabled(true);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.heart}>❤️</Text>
        <Text style={styles.title}>Love Time</Text>
        <Text style={styles.subtitle}>Одно напоминание. Один момент любви каждый день.</Text>

        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>Love Time включён</Text>
            <Text style={styles.hint}>Каждый день в 12:00</Text>
          </View>
          <Switch value={enabled} onValueChange={toggleLoveTime} />
        </View>

        <Text style={styles.footer}>Любовь — это действие.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF8F8',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heart: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    color: '#201A1A',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    color: '#6B5E5E',
    marginTop: 10,
    marginBottom: 34,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF2F4',
    borderRadius: 20,
    padding: 18,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2020',
  },
  hint: {
    fontSize: 14,
    color: '#8C7777',
    marginTop: 4,
  },
  footer: {
    marginTop: 28,
    textAlign: 'center',
    color: '#A07777',
    fontSize: 14,
  },
});
