import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import BaronApp from './components/Baron-app';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <BaronApp />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});