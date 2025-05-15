import { Redirect } from 'expo-router';

export default function Index() {
    return <Redirect href={{ pathname: "/(auth)/login" } as any} />;
} 