# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native mobile application built with Expo and TypeScript. The app uses Expo Router for navigation and a light-only theme system (no dark mode).

## Development Commands

```bash
# Start development server
npm start

# Start on iOS simulator
npm run ios

# Start on Android emulator
npm run android

# Start on web
npm run web

# Run linter
npm run lint

# Reset project
npm run reset-project
```

## Architecture

### Navigation

- Uses Expo Router for file-based routing
- Root layout at `app/_layout.tsx` handles font loading and providers
- Tab navigation in `app/(tabs)/` directory
- Stack navigation for other screens (login, onboarding, lessons, etc.)

### Theme System

- **Theme Provider**: `contexts/theme-context.tsx`
- **Light only**: No dark mode. Single color palette, no AsyncStorage persistence.
- **Brand colors**: Blue `#01B2FE` (primary), Orange `#FF7A1A` (accent)
- `useTheme()` returns `{ colors }` only (no `isDark`, no `mode`, no `setMode`)

#### Theme Color Variables

```typescript
interface ThemeColors {
  primary: string;           // Brand blue: #01B2FE
  accent: string;            // Brand orange: #FF7A1A
  background: string;        // Screen background: #FFFFFF
  card: string;             // Card backgrounds: #FFFFFF
  cardBorder: string;       // Card borders: #E5E7EB
  text: string;             // Primary text: #111827
  textSecondary: string;    // Secondary text: #6B7280
  buttonPrimary: string;    // Primary buttons: #01B2FE
  buttonPrimaryText: string; // #FFFFFF
  buttonSecondary: string;  // Secondary buttons: #F3F4F6
  buttonSecondaryText: string; // #111827
  border: string;           // #E5E7EB
  success: string;          // #10B981
  error: string;            // #EF4444
  inputBackground: string;  // #FFFFFF
  inputBorder: string;      // #D1D5DB
}
```

### Typography

**Font Family**: Host Grotesk

All screens MUST use Host Grotesk font. DO NOT use system fonts or other custom fonts.

#### Font Weights

- **HostGrotesk-Regular**: Body text, descriptions, labels, input fields
- **HostGrotesk-Medium**: Setting titles, medium-weight text
- **HostGrotesk-SemiBold**: Buttons, badges, category labels, section headers
- **HostGrotesk-Bold**: Headings, titles, emphasized text, score values

#### Font Loading

Fonts are loaded in `app/_layout.tsx`:

```typescript
const [fontsLoaded] = useFonts({
  'HostGrotesk-Regular': require('../assets/fonts/Host_Grotesk/HostGrotesk-Regular.ttf'),
  'HostGrotesk-Medium': require('../assets/fonts/Host_Grotesk/HostGrotesk-Medium.ttf'),
  'HostGrotesk-SemiBold': require('../assets/fonts/Host_Grotesk/HostGrotesk-SemiBold.ttf'),
  'HostGrotesk-Bold': require('../assets/fonts/Host_Grotesk/HostGrotesk-Bold.ttf'),
});
```

### Styling Guidelines

#### 1. Always Use Theme Colors

❌ **NEVER** do this:
```typescript
const styles = StyleSheet.create({
  text: {
    color: '#FFFFFF',
  }
});
```

✅ **ALWAYS** do this:
```typescript
const { colors } = useTheme();

<Text style={[styles.text, { color: colors.text }]}>Hello</Text>
```

#### 2. Always Use Host Grotesk Font

❌ **NEVER** do this:
```typescript
const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
  }
});
```

✅ **ALWAYS** do this:
```typescript
const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
  }
});
```

#### 3. StatusBar Configuration

Every screen MUST include proper StatusBar configuration:

- **White background screens**: `barStyle="dark-content"`
- **Blue background screens** (hero/onboarding): `barStyle="light-content"`

```typescript
import { StatusBar } from 'react-native';
import { useTheme } from '@/contexts/theme-context';

export default function Screen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* Screen content */}
    </SafeAreaView>
  );
}
```

#### 4. SafeAreaView Usage

Always use SafeAreaView from 'react-native-safe-area-context':

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
```

**IMPORTANT: Tab Screens SafeAreaView**

For screens inside `app/(tabs)/`, use `edges={['top']}` to prevent double bottom padding (tab bar already handles bottom safe area):

```typescript
// ❌ WRONG - causes extra space above tab bar
<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

// ✅ CORRECT - only applies safe area to top
<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
```

#### 5. Static vs Dynamic Styles

Use StyleSheet.create() for static styles, inline styles for dynamic/theme-dependent values:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 8,
  },
});

// Apply dynamic colors inline
<View style={[styles.container, { backgroundColor: colors.background }]}>
  <Text style={[styles.title, { color: colors.text }]}>Title</Text>
</View>
```

### Component Patterns

#### Screen Component Structure

```typescript
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/theme-context';

export default function ScreenName() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Screen content */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ... other static styles
});
```

## File Organization

```
app/
├── (tabs)/              # Tab navigation screens
│   ├── index.tsx        # Dashboard
│   ├── library.tsx      # Library/Browse
│   ├── profile.tsx      # Profile/Settings
│   └── _layout.tsx      # Tab navigator config
├── lesson/
│   └── [id].tsx         # Dynamic lesson screen
├── login.tsx            # Login screen
├── onboarding.tsx       # Onboarding flow
├── _layout.tsx          # Root layout
└── ...

contexts/
├── auth-context.tsx     # Authentication state
└── theme-context.tsx    # Theme state

lib/
├── supabase/           # Supabase client
├── lessons.ts          # Lesson data/logic
└── scoring.ts          # Scoring logic

assets/
└── fonts/
    └── Host_Grotesk/   # Font files
```

## Key Implementation Notes

### Screen Registration

**CRITICAL**: Every new screen MUST be registered in `app/_layout.tsx`

All screens must be added to the Stack navigator with `headerShown: false`:

```typescript
<Stack>
  <Stack.Screen name="index" options={{ headerShown: false }} />
  <Stack.Screen name="login" options={{ headerShown: false }} />
  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
  <Stack.Screen name="test-intro" options={{ headerShown: false }} />
  <Stack.Screen name="test/[questionId]" options={{ headerShown: false }} />
  <Stack.Screen name="user-info" options={{ headerShown: false }} />
  <Stack.Screen name="results" options={{ headerShown: false }} />
  <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
  <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
</Stack>
```

**Why `headerShown: false`?**
- Ensures custom header implementations work correctly
- Prevents default Expo header from appearing
- Maintains consistent navigation behavior across the app
- Allows full control over screen layout and SafeAreaView

**When creating a new screen:**
1. Create the screen file (e.g., `app/new-screen.tsx`)
2. Immediately add it to `app/_layout.tsx` with `headerShown: false`
3. Implement custom StatusBar and SafeAreaView in the screen component

### Authentication

- Uses Supabase for authentication
- Auth context provides: `user`, `loading`, `signOut()`
- Protected routes check auth state

### Data Management

- Supabase for backend/database
- Real-time data fetching with hooks
- User profiles stored in 'users' table

### Best Practices

1. **Never hardcode colors** - Always use theme colors
2. **Never use system fonts** - Always use Host Grotesk
3. **Always configure StatusBar** - Use `dark-content` for white bg, `light-content` for blue bg
4. **Use SafeAreaView** - For proper device spacing
5. **Handle loading states** - Show ActivityIndicator
6. **Handle error states** - Show error messages
7. **Type everything** - Use TypeScript strictly
8. **Export interfaces** - Share types across files

### Common Patterns

#### Loading State
```typescript
if (loading) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}
```

#### Error State
```typescript
if (error) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error.message}
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

## Important Constraints

- **NEVER** create new font families - Only use Host Grotesk
- **NEVER** hardcode colors - Always use theme system
- **NEVER** skip StatusBar configuration
- **NEVER** use `fontWeight` with Host Grotesk - Use appropriate font family
- **NEVER** forget to register new screens in `app/_layout.tsx` with `headerShown: false`
- **ALWAYS** use SafeAreaView for screens
- **ALWAYS** use `edges={['top']}` on SafeAreaView for tab screens to prevent double bottom padding
- **ALWAYS** handle loading and error states
- **ALWAYS** apply theme colors dynamically
- **ALWAYS** register screens in `_layout.tsx` immediately after creating them
