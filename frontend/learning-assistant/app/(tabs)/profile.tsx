import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, TextInput, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import authService from '@/services/authService';
import axios from 'axios';

interface UserProfile {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    date_joined: string;
    courses_count: number;
}

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [editForm, setEditForm] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
    });

    const fetchProfile = async () => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.get('http://192.168.1.135:8000/api/profile/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setProfile(response.data);
            setEditForm({
                username: response.data.username,
                email: response.data.email,
                first_name: response.data.first_name || '',
                last_name: response.data.last_name || '',
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                router.replace('/(auth)/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchProfile();
    }, []);

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await authService.logout();
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
    };

    const handleSaveProfile = async () => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.put('http://192.168.1.135:8000/api/profile/', {
                username: editForm.username,
                first_name: editForm.first_name,
                last_name: editForm.last_name,
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setIsEditing(false);
            fetchProfile();
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    router.replace('/(auth)/login');
                } else {
                    Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
                }
            }
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({
            username: profile?.username || '',
            email: profile?.email || '',
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    const getDisplayName = () => {
        if (profile?.first_name && profile?.last_name) {
            return `${profile.first_name} ${profile.last_name}`;
        }
        return profile?.username || '?';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>👤 Profile</Text>
                <TouchableOpacity 
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#007AFF"]}
                        tintColor="#007AFF"
                    />
                }
            >
                <View style={styles.profileCard}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {profile?.first_name ? profile.first_name[0].toUpperCase() : 
                             profile?.username ? profile.username[0].toUpperCase() : '?'}
                        </Text>
                    </View>

                    {isEditing ? (
                        <View style={styles.editForm}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.first_name}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, first_name: text }))}
                                    placeholder="Enter name"
                                    autoCapitalize="words"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Family Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.last_name}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, last_name: text }))}
                                    placeholder="Enter family name"
                                    autoCapitalize="words"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Username</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.username}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, username: text }))}
                                    placeholder="Enter username"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <Text style={[styles.input, styles.readOnlyInput]}>{editForm.email}</Text>
                            </View>

                            <View style={styles.editButtons}>
                                <TouchableOpacity 
                                    style={[styles.editButton, styles.cancelButton]}
                                    onPress={handleCancelEdit}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.editButton, styles.saveButton]}
                                    onPress={handleSaveProfile}
                                >
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.infoSection}>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Name</Text>
                                <Text style={styles.value}>{profile?.first_name || '-'}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Family Name</Text>
                                <Text style={styles.value}>{profile?.last_name || '-'}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Username</Text>
                                <Text style={styles.value}>{profile?.username || '-'}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Email</Text>
                                <Text style={styles.value}>{profile?.email || '-'}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Member Since</Text>
                                <Text style={styles.value}>
                                    {profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : '-'}
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Total Courses</Text>
                                <Text style={styles.value}>{profile?.courses_count || 0}</Text>
                            </View>

                            <TouchableOpacity 
                                style={styles.editProfileButton}
                                onPress={() => setIsEditing(true)}
                            >
                                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: 0.3,
    },
    logoutButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#ff3b30',
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    profileCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 20,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    avatarText: {
        color: '#fff',
        fontSize: 48,
        fontWeight: '800',
        letterSpacing: 1,
    },
    infoSection: {
        width: '100%',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    label: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    value: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    editForm: {
        width: '100%',
        paddingTop: 12,
    },
    inputGroup: {
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    editButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 24,
    },
    editButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    editProfileButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    editProfileButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    readOnlyInput: {
        backgroundColor: '#f0f0f0',
        color: '#6c757d',
        borderColor: '#dee2e6',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
}); 