import React from 'react';
import { Text as RNText, TextProps, TouchableOpacity, TouchableOpacityProps, TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export const Text = ({ style, ...props }: TextProps) => {
  const colorScheme = useColorScheme() ?? 'light';
  return <RNText style={[styles.text(colorScheme), style]} {...props} />;
};

export const Button = ({ children, style, disabled, ...props }: TouchableOpacityProps & { children: React.ReactNode }) => {
  const colorScheme = useColorScheme() ?? 'light';
  return (
    <TouchableOpacity 
      style={[styles.button(colorScheme), disabled && styles.buttonDisabled(colorScheme), style]} 
      disabled={disabled}
      {...props}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled(colorScheme)]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export const TextInput = ({ style, ...props }: TextInputProps) => {
  const colorScheme = useColorScheme() ?? 'light';
  return (
    <RNTextInput 
      style={[styles.input(colorScheme), { color: '#000' }, style]}
      placeholderTextColor={Colors[colorScheme].gray}
      {...props}
    />
  );
};

const styles = {
  text: (colorScheme: 'light' | 'dark') => StyleSheet.create({
    text: {
      color: Colors[colorScheme].text,
    },
  }).text,
  button: (colorScheme: 'light' | 'dark') => StyleSheet.create({
    button: {
      backgroundColor: Colors[colorScheme].primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
  }).button,
  buttonDisabled: (colorScheme: 'light' | 'dark') => StyleSheet.create({
    buttonDisabled: {
      backgroundColor: Colors[colorScheme].gray,
    },
  }).buttonDisabled,
  buttonText: StyleSheet.create({
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  }).buttonText,
  buttonTextDisabled: (colorScheme: 'light' | 'dark') => StyleSheet.create({
    buttonTextDisabled: {
      color: Colors[colorScheme].lightGray,
    },
  }).buttonTextDisabled,
  input: (colorScheme: 'light' | 'dark') => StyleSheet.create({
    input: {
      backgroundColor: Colors[colorScheme].background,
      padding: 12,
      borderRadius: 8,
      color: Colors[colorScheme].text,
      fontSize: 16,
    },
  }).input,
}; 