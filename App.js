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
  (name) => `Напиши ${name}: «Я ценю тебя и рад, что ты есть в моей жизни»`,
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

const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, Times New Roman, serif',
});

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
        weekday: 'long',
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
    message('Любовь проявлена', 'Ты сделал этот день теплее.');
  };

  const toggleLoveTime = async (value) => {
    if (Platform.OS === 'web') {
      setEnabled(value);
      saveWebState('loveTimeEnabled', value);
      message(
        value ? 'Напоминания включены' : 'Напоминания выключены',
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
        message('Разреши уведомления', 'Love Time нужен доступ к уведомлениям.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Love Time',
          body: 'Выбери человека и прояви к нему любовь сегодня.',
          data: { loveTime: true },
          sound: true,
        },
        trigger: { seconds: 10 },
      });
      setEnabled(true);
      message('Love Time включён', 'Тестовое уведомление придёт через 10 секунд.');
    } catch {
      message('Не получилось включить', 'Попробуй ещё раз.');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.mark}>
            <Text style={styles.markText}>♥</Text>
          </View>
          <Text style={styles.brand}>LOVE / TIME</Text>
          <Text style={styles.issue}>DAILY 001</Text>
        </View>

        <Text style={styles.date}>{todayLabel}</Text>
        <Text style={styles.hero}>
          Кому сегодня{'
'}
          достанется твоя <Text style={styles.heroAccent}>любовь?</Text>
        </Text>

        <View style={styles.rule} />

        <View style={styles.sectionTop}>
          <Text style={styles.sectionNumber}>01</Text>
          <Text style={styles.sectionLabel}>ВЫБЕРИ ЧЕЛОВЕКА</Text>
        </View>

        <View style={styles.inputShell}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={addPerson}
            placeholder="Введи имя"
            placeholderTextColor="#897A70"
            style={styles.input}
          />
          <Pressable onPress={addPerson} style={styles.addButton}>
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        </View>

        {people.length ? (
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
          <Text style={styles.empty}>Здесь появятся близкие тебе люди</Text>
        )}

        <View style={styles.ritualCard}>
          <View style={styles.ritualTop}>
            <Text style={styles.ritualNumber}>02</Text>
            <Text style={styles.ritualLabel}>СЕГОДНЯШНИЙ РИТУАЛ</Text>
            <Text style={styles.ritualHeart}>♥</Text>
          </View>

          {task ? (
            <>
              <Text style={styles.forPerson}>ДЛЯ {selected.toUpperCase()}</Text>
              <Text style={styles.taskText}>{task}</Text>
              <Pressable onPress={completeTask} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Я СДЕЛАЛ ЭТО</Text>
                <Text style={styles.arrow}>→</Text>
              </Pressable>
              <Pressable onPress={getTask}>
                <Text style={styles.another}>выбрать другое задание</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardQuote}>
                {selected
                  ? `Маленькое действие для ${selected} может изменить весь день.`
                  : 'Сначала выбери того, кому хочешь подарить немного тепла.'}
              </Text>
              <Pressable
                onPress={getTask}
                style={[styles.getButton, !selected && styles.getButtonDisabled]}
              >
                <Text style={styles.getButtonText}>ПОЛУЧИТЬ ЗАДАНИЕ</Text>
                <Text style={styles.arrowDark}>→</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.scoreBox}>
            <Text style={styles.score}>{String(completed).padStart(2, '0')}</Text>
            <Text style={styles.scoreLabel}>ПРОЯВЛЕНИЙ{'
'}ЛЮБВИ</Text>
          </View>
          <View style={styles.reminderBox}>
            <View>
              <Text style={styles.reminderTitle}>Напоминать</Text>
              <Text style={styles.reminderHint}>каждый день</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggleLoveTime}
              trackColor={{ false: '#CFC2B7', true: '#692B3A' }}
              thumbColor="#F7F0E6"
            />
          </View>
        </View>

        <Text style={styles.footer}>LOVE IS A VERB · ЛЮБОВЬ — ЭТО ДЕЙСТВИЕ</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1E8DC' },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 42,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#692B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: '#F1E8DC', fontSize: 14 },
  brand: {
    color: '#2B2420',
    marginLeft: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.1,
  },
  issue: {
    color: '#76685F',
    marginLeft: 'auto',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  date: {
    color: '#76685F',
    fontSize: 12,
    marginTop: 38,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  hero: {
    color: '#2B2420',
    fontFamily: serif,
    fontSize: 42,
    lineHeight: 47,
    marginTop: 10,
    letterSpacing: -1,
  },
  heroAccent: { color: '#8C2F43', fontStyle: 'italic' },
  rule: { height: 1, backgroundColor: '#B8A99D', marginVertical: 26 },
  sectionTop: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  sectionNumber: {
    color: '#8C2F43',
    fontFamily: serif,
    fontSize: 24,
    marginRight: 10,
  },
  sectionLabel: {
    color: '#2B2420',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  inputShell: {
    flexDirection: 'row',
    backgroundColor: '#F9F4EC',
    borderWidth: 1,
    borderColor: '#C6B7AB',
    minHeight: 58,
  },
  input: {
    flex: 1,
    color: '#2B2420',
    fontFamily: serif,
    fontSize: 18,
    paddingHorizontal: 16,
  },
  addButton: {
    width: 58,
    backgroundColor: '#2B2420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#F9F4EC', fontSize: 24, fontWeight: '300' },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  person: {
    borderWidth: 1,
    borderColor: '#9C8C80',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  personSelected: { backgroundColor: '#8C2F43', borderColor: '#8C2F43' },
  personText: { color: '#4E433C', fontSize: 13 },
  personTextSelected: { color: '#FFF8EF' },
  empty: {
    color: '#897A70',
    fontFamily: serif,
    fontStyle: 'italic',
    fontSize: 13,
    marginTop: 12,
  },
  ritualCard: {
    backgroundColor: '#692B3A',
    marginTop: 28,
    padding: 22,
    minHeight: 262,
  },
  ritualTop: { flexDirection: 'row', alignItems: 'baseline' },
  ritualNumber: {
    color: '#E0A358',
    fontFamily: serif,
    fontSize: 25,
    marginRight: 10,
  },
  ritualLabel: {
    color: '#EEDDD4',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  ritualHeart: { color: '#E0A358', marginLeft: 'auto', fontSize: 19 },
  forPerson: {
    color: '#E0A358',
    marginTop: 29,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cardQuote: {
    color: '#FAF1E8',
    fontFamily: serif,
    fontSize: 25,
    lineHeight: 32,
    marginTop: 31,
  },
  taskText: {
    color: '#FAF1E8',
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 31,
    marginTop: 9,
  },
  getButton: {
    backgroundColor: '#E0A358',
    marginTop: 'auto',
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  getButtonDisabled: { opacity: 0.45 },
  getButtonText: {
    color: '#2B2420',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  arrowDark: { color: '#2B2420', fontSize: 22, marginLeft: 'auto' },
  doneButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#A86573',
    marginTop: 25,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#E0A358',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  arrow: { color: '#E0A358', fontSize: 22, marginLeft: 'auto' },
  another: {
    color: '#D8B9BE',
    fontFamily: serif,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 13,
  },
  bottomGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  scoreBox: {
    width: 116,
    backgroundColor: '#E0A358',
    padding: 15,
    minHeight: 98,
  },
  score: {
    color: '#2B2420',
    fontFamily: serif,
    fontSize: 35,
    lineHeight: 37,
  },
  scoreLabel: {
    color: '#2B2420',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  reminderBox: {
    flex: 1,
    backgroundColor: '#F9F4EC',
    borderWidth: 1,
    borderColor: '#C6B7AB',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTitle: { color: '#2B2420', fontFamily: serif, fontSize: 17 },
  reminderHint: { color: '#897A70', fontSize: 11, marginTop: 3 },
  footer: {
    color: '#76685F',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
});
