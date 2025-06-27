import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
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
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (): Promise<void> => {
        // Validation checks
        if (!formData.email.trim()) {
            Alert.alert('Incomplete Form', 'Please enter your email address.');
            return;
        }

        if (!formData.username.trim()) {
            Alert.alert('Incomplete Form', 'Please enter a username.');
            return;
        }

        if (!formData.firstName.trim()) {
            Alert.alert('Incomplete Form', 'Please enter your first name.');
            return;
        }

        if (!formData.lastName.trim()) {
            Alert.alert('Incomplete Form', 'Please enter your last name.');
            return;
        }

        if (!formData.password.trim()) {
            Alert.alert('Incomplete Form', 'Please create a password.');
            return;
        }

        if (!formData.password2.trim()) {
            Alert.alert('Incomplete Form', 'Please confirm your password.');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        // Password length validation
        if (formData.password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
            return;
        }

        // Password confirmation validation
        if (formData.password !== formData.password2) {
            Alert.alert('Password Mismatch', 'Passwords do not match. Please check and try again.');
            return;
        }

        // Username validation (basic)
        if (formData.username.length < 3) {
            Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
            return;
        }

        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formContainer}>
                    <Text style={styles.title}>Create Account</Text>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., john.doe@example.com"
                            value={formData.email}
                            onChangeText={(text) => setFormData({...formData, email: text})}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Choose a unique username"
                            value={formData.username}
                            onChangeText={(text) => setFormData({...formData, username: text})}
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.nameContainer}>
                        <View style={[styles.inputContainer, styles.nameInput]}>
                            <Text style={styles.inputLabel}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="First name"
                                value={formData.firstName}
                                onChangeText={(text) => setFormData({...formData, firstName: text})}
                                autoCapitalize="words"
                                editable={!loading}
                            />
                        </View>
                        
                        <View style={[styles.inputContainer, styles.nameInput]}>
                            <Text style={styles.inputLabel}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Last name"
                                value={formData.lastName}
                                onChangeText={(text) => setFormData({...formData, lastName: text})}
                                autoCapitalize="words"
                                editable={!loading}
                            />
                        </View>
                    </View>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Create a secure password"
                            value={formData.password}
                            onChangeText={(text) => setFormData({...formData, password: text})}
                            secureTextEntry
                            editable={!loading}
                        />
                    </View>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Re-enter your password"
                            value={formData.password2}
                            onChangeText={(text) => setFormData({...formData, password2: text})}
                            secureTextEntry
                            editable={!loading}
                        />
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Register</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => router.push({ pathname: "/(auth)/login" } as any)}
                        style={styles.linkButton}
                        disabled={loading}
                    >
                        <Text style={styles.linkText}>
                            Already have an account? Sign In
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        minHeight: '100%',
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
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
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
        height: 50,
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
        paddingBottom: 20,
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