import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type TabPath = '/(tabs)' | '/(tabs)/profile' | '/(tabs)/chatbot' | '/(tabs)/load_documents';
type TabIconName = 'home-outline' | 'home' | 'person-outline' | 'person' | 'chatbubble-outline' | 'chatbubble' | 'document-outline' | 'document';

interface Tab {
    name: string;
    path: TabPath;
    icon: TabIconName;
    activeIcon: TabIconName;
}

export function CustomTabBar() {
    const pathname = usePathname();
    const router = useRouter();

    const tabs: Tab[] = [
        {
            name: 'Home',
            path: '/(tabs)',
            icon: 'home-outline',
            activeIcon: 'home'
        },
        {
            name: 'Assistant',
            path: '/(tabs)/chatbot',
            icon: 'chatbubble-outline',
            activeIcon: 'chatbubble'
        },
        {
            name: 'Documents',
            path: '/(tabs)/load_documents',
            icon: 'document-outline',
            activeIcon: 'document'
        },
        {
            name: 'Profile',
            path: '/(tabs)/profile',
            icon: 'person-outline',
            activeIcon: 'person'
        }
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = pathname === tab.path;
                return (
                    <TouchableOpacity
                        key={tab.path}
                        style={styles.tab}
                        onPress={() => router.push(tab.path)}
                    >
                        <Ionicons
                            name={isActive ? tab.activeIcon : tab.icon}
                            size={24}
                            color={isActive ? '#007AFF' : '#666'}
                        />
                        <Text style={[
                            styles.tabText,
                            isActive && styles.activeTabText
                        ]}>
                            {tab.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    tabText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    activeTabText: {
        color: '#007AFF',
    },
}); 