import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let mounted = true;
    // Determine if we're already on an auth route (e.g., /auth/callback)
    const inAuth = Array.isArray(segments) && segments[0] === 'auth';
    // Check initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const authed = !!data.session;
      if (!authed && !inAuth) router.replace('/auth');
      if (authed && inAuth) router.replace('/(tabs)');
    });
    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        // Avoid redirect loop while on auth routes like /auth/callback
        const inAuthNow = Array.isArray(segments) && segments[0] === 'auth';
        if (!inAuthNow) router.replace('/auth');
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Match concrete routes to avoid "No route named 'auth'" warning */}
        <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
