import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import authService from '../../services/authService';

interface FormData {
    email: string;
    username: string;
    password: string;
    password2: string;
}

const RegisterScreen: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        email: '',
        username: '',
        password: '',
        password2: ''
    });
    const router = useRouter();

    const handleRegister = async (): Promise<void> => {
        try {
            await authService.register(
                formData.email,
                formData.username,
                formData.password,
                formData.password2
            );
            Alert.alert(
                'Success',
                'Registration successful! Please login.',
                [{ text: 'OK', onPress: () => router.push({ pathname: "/(auth)/login" } as any) }]
            );
        } catch (error: any) {
            console.error('Registration error:', error);
            Alert.alert(
                'Registration Failed',
                error.message || 'Failed to register. Please try again.'
            );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
                <Text style={styles.title}>Create Account</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                
                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    value={formData.username}
                    onChangeText={(text) => setFormData({...formData, username: text})}
                    autoCapitalize="none"
                />
                
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    secureTextEntry
                />
                
                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={formData.password2}
                    onChangeText={(text) => setFormData({...formData, password2: text})}
                    secureTextEntry
                />
                
                <TouchableOpacity 
                    style={styles.button}
                    onPress={handleRegister}
                >
                    <Text style={styles.buttonText}>Register</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => router.push({ pathname: "/(auth)/login" } as any)}
                    style={styles.linkButton}
                >
                    <Text style={styles.linkText}>
                        Already have an account? Sign In
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#007AFF',
        fontSize: 16,
    },
});

export default RegisterScreen; 