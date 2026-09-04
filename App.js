import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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

const TASKS = [
  (name) => `Напиши ${name}: «Я ценю тебя и рад, что ты есть в моей жизни» ❤️`,
  (name) => `Позвони ${name} без повода и спроси, как он себя чувствует.`,
  (name) => `Вспомни, за что ты благодарен ${name}, и скажи это прямо сегодня.`,
  (name) => `Сделай для ${name} маленький приятный сюрприз без ожидания ответа.`,
  (name) => `Отправь ${name} вашу общую фотографию и напиши, почему этот момент тебе дорог.`,
  (name) => `Удели ${name} 10 минут полного внимания — без телефона и других дел.`,
];

const readWebState = (key, fallback) => {
  if (Platform.OS !== 'web') return fallback;
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const saveWebState = (key, value) => {
  if (Platform.OS !== 'web') return;
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {}
};

export default function App() {
  const [people, setPeople] = useState(() => readWebState('lovePeople', []));
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [task, setTask] = useState('');
  const [completed, setCompleted] = useState(() => readWebState('loveCompleted', 0));
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setEnabled(readWebState('loveTimeEnabled', false));
      return;
    }

    Notifications.getAllScheduledNotificationsAsync()
      .then((items) =>
        setEnabled(items.some((item) => item.content?.data?.loveTime === true))
      )
      .catch(() => setEnabled(false));
  }, []);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    []
  );

  const message = (title, body) => {
    if (Platform.OS === 'web') globalThis.alert(`${title}\n\n${body}`);
    else Alert.alert(title, body);
  };

  const addPerson = () => {
    const clean = name.trim();
    if (!clean) {
      message('Добавь человека', 'Напиши его имя.');
      return;
    }
    if (!people.includes(clean)) {
      const next = [...people, clean];
      setPeople(next);
      saveWebState('lovePeople', next);
    }
    setSelected(clean);
    setName('');
    setTask('');
  };

  const removePerson = (person) => {
    const next = people.filter((item) => item !== person);
    setPeople(next);
    saveWebState('lovePeople', next);
    if (selected === person) {
      setSelected('');
      setTask('');
    }
  };

  const getTask = () => {
    if (!selected) {
      message('Сначала выбери человека', 'Добавь имя или нажми на имя в списке.');
      return;
    }
    const options = TASKS.map((create) => create(selected)).filter((item) => item !== task);
    setTask(options[Math.floor(Math.random() * options.length)]);
  };

  const completeTask = () => {
    const next = completed + 1;
    setCompleted(next);
    saveWebState('loveCompleted', next);
    setTask('');
    message('Любовь проявлена ❤️', 'Ты сделал этот день теплее.');
  };

  const toggleLoveTime = async (value) => {
    if (Platform.OS === 'web') {
      setEnabled(value);
      saveWebState('loveTimeEnabled', value);
      message(
        value ? 'Напоминания включены ❤️' : 'Напоминания выключены',
        value
          ? 'Выбор сохранён. В установленной версии уведомление будет приходить каждый день.'
          : 'Выбор сохранён.'
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
        message('Разреши уведомления ❤️', 'Love Time нужен доступ к уведомлениям.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Love Time ❤️',
          body: 'Выбери человека и прояви к нему любовь сегодня.',
          data: { loveTime: true },
          sound: true,
        },
        trigger: { seconds: 10 },
      });
      setEnabled(true);
      message('Love Time включён ❤️', 'Тестовое уведомление придёт через 10 секунд.');
    } catch {
      message('Не получилось включить', 'Попробуй ещё раз.');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.logo}>❤️</Text>
          <View>
            <Text style={styles.title}>Love Time</Text>
            <Text style={styles.date}>{todayLabel}</Text>
          </View>
          <View style={styles.counter}>
            <Text style={styles.counterNumber}>{completed}</Text>
            <Text style={styles.counterLabel}>добрых дел</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.step}>ШАГ 1</Text>
          <Text style={styles.heading}>Кому подарим любовь?</Text>

          <View style={styles.inputRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              onSubmitEditing={addPerson}
              placeholder="Имя человека"
              placeholderTextColor="#A88E92"
              style={styles.input}
            />
            <Pressable onPress={addPerson} style={styles.addButton}>
              <Text style={styles.addButtonText}>Добавить</Text>
            </Pressable>
          </View>

          {people.length > 0 ? (
            <View style={styles.people}>
              {people.map((person) => (
                <Pressable
                  key={person}
                  onPress={() => {
                    setSelected(person);
                    setTask('');
                  }}
                  onLongPress={() => removePerson(person)}
                  style={[
                    styles.person,
                    selected === person && styles.personSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.personText,
                      selected === person && styles.personTextSelected,
                    ]}
                  >
                    {person}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>Добавь первого близкого человека</Text>
          )}
        </View>

        <View style={[styles.card, !selected && styles.cardMuted]}>
          <Text style={styles.step}>ШАГ 2</Text>
          <Text style={styles.heading}>
            {selected ? `Задание для ${selected}` : 'Выбери человека'}
          </Text>

          {task ? (
            <>
              <View style={styles.taskBox}>
                <Text style={styles.taskText}>{task}</Text>
              </View>
              <Pressable onPress={completeTask} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>✓ Выполнено</Text>
              </Pressable>
              <Pressable onPress={getTask} style={styles.linkButton}>
                <Text style={styles.linkText}>Другое задание</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={getTask}
              style={[styles.mainButton, !selected && styles.disabledButton]}
            >
              <Text style={styles.mainButtonText}>Получить задание любви</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.reminder}>
          <View style={styles.reminderCopy}>
            <Text style={styles.reminderTitle}>Ежедневное напоминание</Text>
            <Text style={styles.reminderHint}>не забывать проявлять любовь</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleLoveTime}
            trackColor={{ false: '#C9C0C2', true: '#FF7185' }}
          />
        </View>

        <Text style={styles.tip}>Чтобы удалить имя, нажми на него и подержи</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF7F8' },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    padding: 20,
    paddingTop: 34,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: { fontSize: 40, marginRight: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#27181B' },
  date: { color: '#927B80', marginTop: 2 },
  counter: {
    marginLeft: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  counterNumber: { color: '#E9435C', fontSize: 20, fontWeight: '800' },
  counterLabel: { color: '#927B80', fontSize: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  cardMuted: { opacity: 0.82 },
  step: {
    color: '#E9435C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heading: {
    color: '#27181B',
    fontSize: 22,
    fontWeight: '750',
    marginTop: 6,
    marginBottom: 18,
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#FFF2F4',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: '#27181B',
    fontSize: 16,
    outlineStyle: 'none',
  },
  addButton: {
    justifyContent: 'center',
    backgroundColor: '#27181B',
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '700' },
  people: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  person: {
    borderWidth: 1,
    borderColor: '#F3C9D0',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  personSelected: { backgroundColor: '#E9435C', borderColor: '#E9435C' },
  personText: { color: '#6B454C', fontWeight: '600' },
  personTextSelected: { color: '#FFFFFF' },
  empty: { color: '#A88E92', textAlign: 'center', marginTop: 18 },
  mainButton: {
    backgroundColor: '#E9435C',
    borderRadius: 16,
    paddingVertical: 16,
  },
  disabledButton: { backgroundColor: '#D8CACE' },
  mainButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
  },
  taskBox: {
    backgroundColor: '#FFF2F4',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },
  taskText: {
    color: '#5B2630',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#E9435C',
    borderRadius: 16,
    paddingVertical: 15,
  },
  doneButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: { paddingVertical: 13 },
  linkText: {
    textAlign: 'center',
    color: '#A64151',
    fontWeight: '600',
  },
  reminder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderCopy: { flex: 1, paddingRight: 10 },
  reminderTitle: { color: '#27181B', fontSize: 16, fontWeight: '700' },
  reminderHint: { color: '#927B80', fontSize: 12, marginTop: 3 },
  tip: {
    color: '#B19A9F',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
  },
});
