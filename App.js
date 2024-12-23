import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Button, TextInput, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Main Timer Screen
function TimerScreen({ navigation, timers, setTimers }) {
  const [appState, setAppState] = useState(AppState.currentState); // Track app state (active/background)

  useEffect(() => {
    const saveTimers = async () => {
      try {
        await AsyncStorage.setItem('timers', JSON.stringify(timers));
      } catch (error) {
        console.error('Error saving timers to storage:', error);
      }
    };
    saveTimers();

    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      if (nextAppState === 'background') {
        // Pause all timers when the app goes to the background
        timers.forEach((timer) => {
          if (timer.running) {
            clearInterval(timer.intervalId);
            setTimers((prevTimers) =>
              prevTimers.map((t) =>
                t.id === timer.id ? { ...t, running: false } : t
              )
            );
          }
        });
      }
    });

    return () => {
      appStateListener.remove();
    };
  }, [timers, setTimers]);

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

  // Check if a timer is more than 5 or 10 minutes behind
  const checkTimerStatus = () => {
    const latestTime = Math.max(...timers.map((t) => t.time)); // Get the latest timer time
    return timers.map((timer) => {
      const timeDifference = latestTime - timer.time;

      let isAmber = false;
      let isRed = false;

      if (timeDifference >= 300 && timeDifference < 600) { // 5 minutes = 300 seconds, 10 minutes = 600 seconds
        isAmber = true;
      }
      if (timeDifference >= 600) {
        isRed = true;
      }

      return {
        ...timer,
        isAmber,
        isRed,
        timeDifference,
      };
    });
  };

  // Sort the timers: Red timers go to the top, then Amber, and then the rest by original order
  const sortedTimers = checkTimerStatus().sort((a, b) => {
    if (a.isRed && !b.isRed) return -1;
    if (!a.isRed && b.isRed) return 1;
    if (a.isAmber && !b.isAmber) return -1;
    if (!a.isAmber && b.isAmber) return 1;
    return 0;
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.item,
        item.running && styles.activeItem, // Apply light blue background if the timer is running
        item.isRed && styles.redItem, // Apply red background if the timer is more than 10 minutes behind
        item.isAmber && styles.amberItem, // Apply amber background if the timer is more than 5 minutes behind
      ]}
      onPress={() => toggleTimer(item.id)}
      onLongPress={() => resetSingleTimer(item.id)}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.timer}>{formatTime(item.time)}</Text>
      <Button
        title="Delete"
        color="red"
        onPress={() => {
          setTimers((prevTimers) => prevTimers.filter((timer) => timer.id !== item.id));
        }}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedTimers}
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

// Admin Page to Add Names
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
      AsyncStorage.setItem('timers', JSON.stringify(updatedTimers)); // Save updated timers
      return updatedTimers;
    });
    setNewName(''); // Clear input after adding
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
  const [timers, setTimers] = useState([]);

  useEffect(() => {
    const loadTimers = async () => {
      try {
        const storedTimers = await AsyncStorage.getItem('timers');
        if (storedTimers) {
          setTimers(JSON.parse(storedTimers));
        }
      } catch (error) {
        console.error('Error loading timers from storage:', error);
      }
    };
    loadTimers();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Timer">
        <Stack.Screen name="Timer">
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
    backgroundColor: '#d0ebff', // Light blue background for active timers
  },
  redItem: {
    backgroundColor: '#ffcccc', // Red background for timers 10+ minutes behind
  },
  amberItem: {
    backgroundColor: '#ffeb99', // Amber background for timers 5-10 minutes behind
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
