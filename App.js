import React, { useState, useEffect } from 'react';
import {
  AppState,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Button,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default list of timers (empty initially)
const defaultTimers = [];

const red = '#FF6347';
const orange = '#F5CA88';
const white = '#fff';
const blue = '#d0ebff';

const orangeWaternark = 300; // 5 minutes
const redWaternark = 600; // 10 minutes

// Helper function to calculate background color based on time difference
const getTimerBackgroundColor = (timer, timers) => {
  let backgroundColor = white; // Default color
  const isActive = timer.running;

  // Check for active timer first
  if (isActive) {
    backgroundColor = blue; // Light blue for active timers
  }

  // Now compare with other timers to adjust the color for delay
  timers.forEach((otherTimer) => {
    if (otherTimer.id !== timer.id && timer.time < otherTimer.time) {
      const timeDiff = otherTimer.time - timer.time;
      if (timeDiff >= redWaternark) {
        backgroundColor = red; // Red (2 minutes behind)
      } else if (timeDiff >= orangeWaternark) {
        backgroundColor = orange; // Orange (1 minute behind)
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
      <Button title="Delete" color="red" onPress={() => deleteTimer(timer.id)} />
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
  const [appState, setAppState] = useState(AppState.currentState);
  const [backgroundTime, setBackgroundTime] = useState(null);
  const { height } = useWindowDimensions(); // Get the height of the screen

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        const currentTime = Date.now();
        const elapsedTime = (currentTime - backgroundTime) / 1000; // Convert to seconds
        setTimers((prevTimers) =>
          prevTimers.map((timer) =>
            timer.running ? { ...timer, time: timer.time + elapsedTime } : timer
          )
        );
      } else if (nextAppState === 'background') {
        // App has gone to the background
        setBackgroundTime(Date.now());
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [appState, backgroundTime, setTimers]);

  // Sort timers: active timers first, then inactive timers
  const sortedTimers = timers.sort((a, b) => {
    // Prioritize active timers (those that are running)
    if (a.running && !b.running) return -1;
    if (!a.running && b.running) return 1;

    // If both timers have the same active status, prioritize red timers (those 2 minutes behind)
    const aBgColor = getTimerBackgroundColor(a, timers);
    const bBgColor = getTimerBackgroundColor(b, timers);

    if (aBgColor === red && bBgColor !== red) return -1;
    if (aBgColor !== red && bBgColor === red) return 1;

    return 0; // No change if both are red or not
  });

  // Find the index where the transition from active to inactive timers occurs
  const separatorIndex = sortedTimers.findIndex((timer) => !timer.running);

  // Render a separator between active and inactive timers
  const renderSeparator = () => {
    return <View style={styles.separator} />;
  };

  // Toggle timer start/stop
  const toggleTimer = (id) => {
    setTimers((prevTimers) => {
      return prevTimers.map((timer) => {
        if (timer.id === id) {
          if (timer.running) {
            // Stop the timer
            clearInterval(timer.intervalId);
            return { ...timer, running: false, intervalId: null };
          } else {
            // Start the timer and store the interval ID
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
      });
    });
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

  // Render timers for mobile (FlatList)
  const renderMobileTimers = () => (
    <FlatList
      data={sortedTimers}
      renderItem={({ item, index }) => (
        <>
          <TimerItem
            timer={item}
            timers={timers}
            toggleTimer={toggleTimer}
            resetTimer={resetSingleTimer}
            deleteTimer={deleteTimer}
          />
          {/* Render separator after the last active timer */}
          {index === separatorIndex - 1 && renderSeparator()}
        </>
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.flatListContent}
    />
  );

  // Render timers for web (ScrollView with explicit height)
  const renderWebTimers = () => (
    <ScrollView
      style={{ height: height - 100 }} // Adjust height to account for buttons and padding
      contentContainerStyle={styles.scrollViewContent}
    >
      {sortedTimers.map((item, index) => (
        <View key={item.id}>
          <TimerItem
            timer={item}
            timers={timers}
            toggleTimer={toggleTimer}
            resetTimer={resetSingleTimer}
            deleteTimer={deleteTimer}
          />
          {/* Render separator after the last active timer */}
          {index === separatorIndex - 1 && renderSeparator()}
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? renderWebTimers() : renderMobileTimers()}
      <View style={styles.bottomButtonsContainer}>
        <Button title="Reset All Timers" onPress={resetTimers} />
        <Button
          title="Go to Admin Panel"
          onPress={() => navigation.navigate('Admin')}
        />
      </View>
    </View>
  );
};

// Admin Screen Component to add new timers
const AdminScreen = ({ timers, setTimers }) => {
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
    const updatedTimers = [...timers, newTimer];
    setTimers(updatedTimers);
    AsyncStorage.setItem('timers', JSON.stringify(updatedTimers)); // Save to storage
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
      <Text>
        Press a timer to start the timer, press again to stop the timer. {'\n'}Long press to reset
        the timer.
      </Text>
      <Text>
        Active timers will go to the top and be Blue. {'\n'}
        If the timer is {orangeWaternark / 60} minutes behind, it will turn Orange {'\n'}
        If the timer is {redWaternark / 60} minutes behind, it will turn Red{'\n'}
      </Text>
    </View>
  );
};

// Main App Component
const App = () => {
  const [timers, setTimers] = useState(defaultTimers);

  // Load timers from storage when the app starts
  useEffect(() => {
    const loadTimers = async () => {
      try {
        const savedTimers = await AsyncStorage.getItem('timers');
        if (savedTimers) {
          setTimers(JSON.parse(savedTimers));
        }
      } catch (error) {
        console.error('Failed to load timers:', error);
      }
    };

    loadTimers();
  }, []);

  // Save timers to storage whenever they change
  useEffect(() => {
    const saveTimers = async () => {
      try {
        await AsyncStorage.setItem('timers', JSON.stringify(timers));
      } catch (error) {
        console.error('Failed to save timers:', error);
      }
    };

    saveTimers();
  }, [timers]);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Timer">
        <Stack.Screen name="Timer" options={{ title: 'Sunbury Braves Timer' }}>
          {(props) => <TimerScreen {...props} timers={timers} setTimers={setTimers} />}
        </Stack.Screen>
        <Stack.Screen name="Admin" options={{ title: 'Admin Panel' }}>
          {(props) => <AdminScreen {...props} timers={timers} setTimers={setTimers} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const Stack = createStackNavigator();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
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
    position: 'absolute',
    bottom: 10, // Raise it higher from the bottom
    left: 20, // Add padding from the left edge
    right: 20, // Add padding from the right edge
    flexDirection: 'row', // Align buttons horizontally
    justifyContent: 'space-between', // Space buttons apart
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 10,
    fontSize: 18,
  },
  separator: {
    height: 1,
    backgroundColor: 'black',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  flatListContent: {
    paddingBottom: 80, // Add padding to avoid buttons overlapping content
  },
  scrollViewContent: {
    flexGrow: 1, // Ensure ScrollView takes up full height
    paddingBottom: 80, // Add padding to avoid buttons overlapping content
  },
});

export default App;