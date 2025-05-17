import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import authService from '../../services/authService';

interface FormData {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    password2: string;
}

const RegisterScreen: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        password: '',
        password2: ''
    });
    const router = useRouter();

    const handleRegister = async (): Promise<void> => {
        try {
            await authService.register(
                formData.email,
                formData.username,
                formData.firstName,
                formData.lastName,
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
                
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        value={formData.email}
                        onChangeText={(text) => setFormData({...formData, email: text})}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Choose a username"
                        value={formData.username}
                        onChangeText={(text) => setFormData({...formData, username: text})}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.nameContainer}>
                    <View style={[styles.inputContainer, styles.nameInput]}>
                        <Text style={styles.inputLabel}>First Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter first name"
                            value={formData.firstName}
                            onChangeText={(text) => setFormData({...formData, firstName: text})}
                            autoCapitalize="words"
                        />
                    </View>
                    
                    <View style={[styles.inputContainer, styles.nameInput]}>
                        <Text style={styles.inputLabel}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter last name"
                            value={formData.lastName}
                            onChangeText={(text) => setFormData({...formData, lastName: text})}
                            autoCapitalize="words"
                        />
                    </View>
                </View>
                
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Create a password"
                        value={formData.password}
                        onChangeText={(text) => setFormData({...formData, password: text})}
                        secureTextEntry
                    />
                </View>
                
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm your password"
                        value={formData.password2}
                        onChangeText={(text) => setFormData({...formData, password2: text})}
                        secureTextEntry
                    />
                </View>
                
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
    nameContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: -15, // Compensate for the input's bottom margin
    },
    nameInput: {
        flex: 1,
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
    inputLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 15,
    },
});

export default RegisterScreen; 