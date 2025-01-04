import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Button, TextInput, Alert, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Default list of names
const defaultTimers = [
  { id: '1', name: 'Rory', time: 0, running: false },
  { id: '2', name: 'Jack', time: 0, running: false },
  { id: '3', name: 'Zach', time: 0, running: false },
  { id: '4', name: 'Harry', time: 0, running: false },
  { id: '5', name: 'Elliot', time: 0, running: false },
  { id: '6', name: 'Tyler', time: 0, running: false },
  { id: '7', name: 'Dan', time: 0, running: false },
  { id: '8', name: 'Braeden', time: 0, running: false },
  { id: '9', name: 'Brax', time: 0, running: false },
];

// Main Timer Screen
function TimerScreen({ navigation, timers, setTimers }) {
  const [appState, setAppState] = useState(AppState.currentState);

  const formatTime = (time) => {
    const totalSeconds = Math.floor(time);
    const tenths = Math.floor((time % 1) * 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s.${tenths}`;
  };

  const toggleTimer = (id) => {
    setTimers((prevTimers) =>
      prevTimers.map((timer) => {
        if (timer.id === id) {
          if (timer.running) {
            clearInterval(timer.intervalId);
            return { ...timer, running: false };
          } else {
            const intervalId = setInterval(() => {
              setTimers((currentTimers) =>
                currentTimers.map((t) =>
                  t.id === id ? { ...t, time: t.time + 0.1 } : t
                )
              );
            }, 100);
            return { ...timer, running: true, intervalId };
          }
        }
        return timer;
      })
    );
  };

  const resetTimers = () => {
    setTimers((prevTimers) => {
      prevTimers.forEach((timer) => {
        if (timer.running) {
          clearInterval(timer.intervalId);
        }
      });
      return prevTimers.map((timer) => ({
        ...timer,
        time: 0,
        running: false,
      }));
    });
  };

  const resetSingleTimer = (id) => {
    setTimers((prevTimers) =>
      prevTimers.map((timer) =>
        timer.id === id
          ? {
              ...timer,
              time: 0,
              running: timer.running,
            }
          : timer
      )
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.item,
        item.running && styles.activeItem,
      ]}
      onPress={() => toggleTimer(item.id)}
      onLongPress={() => resetSingleTimer(item.id)}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.timer}>{formatTime(item.time)}</Text>
      <Button
        title="Delete"
        color="red"
        onPress={() => setTimers((prevTimers) => prevTimers.filter((timer) => timer.id !== item.id))}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={timers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
      <View style={styles.bottomButtonsContainer}>
        <Button title="Reset All Timers" onPress={resetTimers} />
        <Button title="Go to Admin" onPress={() => navigation.navigate('Admin')} />
      </View>
    </View>
  );
}

// Admin Screen
function AdminScreen({ navigation, setTimers }) {
  const [newName, setNewName] = useState('');

  const addName = () => {
    if (newName.trim() === '') {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    const newTimer = {
      id: Date.now().toString(),
      name: newName,
      time: 0,
      running: false,
    };
    setTimers((prevTimers) => {
      const updatedTimers = [...prevTimers, newTimer];
      return updatedTimers;
    });
    setNewName('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter a name"
        value={newName}
        onChangeText={setNewName}
      />
      <Button title="Add Name" onPress={addName} />
      <Button title="Back to Timers" onPress={() => navigation.goBack()} />
    </View>
  );
}

const Stack = createStackNavigator();

export default function App() {
  const [timers, setTimers] = useState(defaultTimers); // Use defaultTimers initially

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Timer">
        <Stack.Screen name="Timer"
        options={{ title: 'Sunbury Braves Player Timer' }}  // Set title for Timer screen
        >
          {(props) => <TimerScreen {...props} timers={timers} setTimers={setTimers} />}
        </Stack.Screen>
        <Stack.Screen name="Admin">
          {(props) => <AdminScreen {...props} setTimers={setTimers} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f5f5f5',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 5,
    elevation: 1,
  },
  activeItem: {
    backgroundColor: '#d0ebff',
  },
  name: {
    fontSize: 18,
  },
  timer: {
    fontSize: 16,
  },
  bottomButtonsContainer: {
    marginTop: 20,
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 10,
    fontSize: 18,
  },
});
