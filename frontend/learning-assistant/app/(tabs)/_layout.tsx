import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: 'none' }  // Hide the default tab bar since we're using a custom one
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                    }}
                />
                <Tabs.Screen
                    name="chatbot"
                    options={{
                        title: 'Assistant',
                    }}
                />
                <Tabs.Screen
                    name="load_documents"
                    options={{
                        title: 'Documents',
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                    }}
                />
                <Tabs.Screen
                    name="explore"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="create-course"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="course/[id]"
                    options={{
                        href: null,
                    }}
                />
            </Tabs>
            <CustomTabBar />
        </View>
    );
}
