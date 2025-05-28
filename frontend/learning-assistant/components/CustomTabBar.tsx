import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { Colors } from '@/constants/Colors';

type TabIconName = 'home-outline' | 'home' | 'chatbubble-outline' | 'chatbubble' | 'help-circle-outline' | 'help-circle' | 'document-text-outline' | 'document-text' | 'person-outline' | 'person';

interface Tab {
    name: string;
    icon: TabIconName;
    activeIcon: TabIconName;
    route: string;
}

export function CustomTabBar() {
    const router = useRouter();
    const pathname = usePathname();

    const tabs: Tab[] = [
        {
            name: 'Home',
            icon: 'home-outline',
            activeIcon: 'home',
            route: '/(tabs)',
        },
        {
            name: 'Assistant',
            icon: 'chatbubble-outline',
            activeIcon: 'chatbubble',
            route: '/(tabs)/assistant',
        },
        {
            name: 'Questions',
            icon: 'help-circle-outline',
            activeIcon: 'help-circle',
            route: '/(tabs)/questions',
        },
        {
            name: 'Documents',
            icon: 'document-text-outline',
            activeIcon: 'document-text',
            route: '/(tabs)/load_documents',
        },
        {
            name: 'Profile',
            icon: 'person-outline',
            activeIcon: 'person',
            route: '/(tabs)/profile',
        },
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = pathname.startsWith(tab.route);
                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => router.push(tab.route as any)}
                    >
                        <Ionicons
                            name={isActive ? tab.activeIcon : tab.icon}
                            size={24}
                            color={isActive ? Colors.light.primary : Colors.light.gray}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                isActive && styles.activeTabText,
                            ]}
                        >
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
        paddingBottom: 20, // Add extra padding for home indicator
        paddingTop: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 12,
        marginTop: 4,
        color: Colors.light.gray,
    },
    activeTabText: {
        color: Colors.light.primary,
    },
}); 