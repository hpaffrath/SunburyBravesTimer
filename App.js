import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Button, TextInput, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Default list of timers
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

const red = '#FF6347'
const orange = '#F5CA88'
const white = '#fff'
const blue = '#d0ebff'

const orangeWaternark = 300 // 5 minutes
const redWaternark = 600 // 10 minutes

// Helper function to calculate background color based on time difference
const getTimerBackgroundColor = (timer, timers) => {
  let backgroundColor = white;  // Default color
  const isActive = timer.running;

  // Check for active timer first
  if (isActive) {
    backgroundColor = blue;  // Light blue for active timers
  }

  // Now compare with other timers to adjust the color for delay
  timers.forEach((otherTimer) => {
    if (otherTimer.id !== timer.id && timer.time < otherTimer.time) {
      const timeDiff = otherTimer.time - timer.time;
      if (timeDiff >= redWaternark) {
        backgroundColor = red;  // Red (2 minutes behind)
      } else if (timeDiff >= orangeWaternark) {
        backgroundColor = orange;  // Orange (1 minute behind)
      }
    }
  });

  return backgroundColor;
};

// Timer Component to handle start, stop, and display
const TimerItem = ({ timer, timers, toggleTimer, resetTimer, deleteTimer }) => {
  const backgroundColor = getTimerBackgroundColor(timer, timers);
  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor }]}
      onPress={() => toggleTimer(timer.id)}
      onLongPress={() => resetTimer(timer.id)}
    >
      <Text style={styles.name}>{timer.name}</Text>
      <Text style={styles.timer}>{formatTime(timer.time)}</Text>
      <Button
        title="Delete"
        color="red"
        onPress={() => deleteTimer(timer.id)}
      />
    </TouchableOpacity>
  );
};

// Format time in minutes, seconds, and tenths of a second
const formatTime = (time) => {
  const totalSeconds = Math.floor(time);
  const tenths = Math.floor((time % 1) * 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s.${tenths}`;
};

// Main Timer Screen Component
const TimerScreen = ({ timers, setTimers, navigation }) => {
  const sortedTimers = timers.sort((a, b) => {
     // Prioritize active timers (those that are running)
    if (a.running && !b.running) return -1;
    if (!a.running && b.running) return 1;

// If both timers have the same active status, prioritize red timers (those 2 minutes behind)
    const aBgColor = getTimerBackgroundColor(a, timers);
    const bBgColor = getTimerBackgroundColor(b, timers);

    if (aBgColor === red && bBgColor !== red) return -1;
    if (aBgColor !== red && bBgColor === red) return 1;

    return 0;  // No change if both are red or not
  });

  // Toggle timer start/stop
  const toggleTimer = (id) => {
    setTimers((prevTimers) =>
      prevTimers.map((timer) =>
        timer.id === id
          ? {
              ...timer,
              running: !timer.running,
              intervalId: !timer.running
                ? setInterval(() => {
                    setTimers((currentTimers) =>
                      currentTimers.map((t) =>
                        t.id === id ? { ...t, time: t.time + 0.1 } : t
                      )
                    );
                  }, 100)
                : clearInterval(timer.intervalId),
            }
          : timer
      )
    );
  };

  // Reset all timers
  const resetTimers = () => {
    setTimers((prevTimers) => {
      // Stop all active timers
      prevTimers.forEach((timer) => {
        if (timer.running) {
          clearInterval(timer.intervalId); // Stop the timer
        }
      });
      return prevTimers.map((timer) => ({
        ...timer,
        time: 0,
        running: false,
      }));
    });
  };

  // Delete timer
  const deleteTimer = (id) => {
    setTimers((prevTimers) => prevTimers.filter((timer) => timer.id !== id));
  };


  // Reset a single timer
  const resetSingleTimer = (id) => {
    setTimers((prevTimers) =>
      prevTimers.map((timer) =>
        timer.id === id ? { ...timer, time: 0, running: false } : timer
      )
    );
  };
  return (
    <View style={styles.container}>
      <FlatList
        data={sortedTimers}
        renderItem={({ item }) => (
          <TimerItem
            timer={item}
            timers={timers}
            toggleTimer={toggleTimer}
            resetTimer={resetSingleTimer}
            deleteTimer={deleteTimer} // Pass deleteTimer here
          />
        )}
        keyExtractor={(item) => item.id}
      />
      <View style={styles.bottomButtonsContainer}>
        <Button title="Reset All Timers" onPress={resetTimers} />
        <Button
          title="Go to Admin Panel"
          onPress={() => navigation.navigate("Admin")}
        />
      </View>
    </View>
  );
};

// Admin Screen Component to add new timers
const AdminScreen = ({ setTimers }) => {
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
    setTimers(prevTimers => [...prevTimers, newTimer]);
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
      <Text>To use the App</Text>
      <Text>Press a timer to start the timer, press again to stop the timer. {'\n'}Long press to reset the timer.</Text>
      <Text>Acive timers will go to the top and be Blue.  {'\n'}
        If the timer is {orangeWaternark / 60} minutes behind, it will turn Orange {'\n'}
        If the timer is {redWaternark / 60} minutes behind, it will turn Red{'\n'}
        </Text>
    </View>
  );
};

// Main App Component
const App = () => {
  const [timers, setTimers] = useState(defaultTimers);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Timer">
        <Stack.Screen name="Timer" options={{ title: 'Sunbury Braves Timer' }}>
          {(props) => <TimerScreen {...props} timers={timers} setTimers={setTimers} />}
        </Stack.Screen>
        <Stack.Screen name="Admin" options={{ title: 'Admin Panel' }}>
          {(props) => <AdminScreen {...props} setTimers={setTimers} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const Stack = createStackNavigator();

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
    padding: 10,
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

export default App;
