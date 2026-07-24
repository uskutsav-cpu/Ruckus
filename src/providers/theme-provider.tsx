import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Appearance, useColorScheme } from 'react-native';

import {
  readThemePreference,
  saveThemePreference
} from '@/features/settings/preferences';
import { darkTheme, lightTheme, type AppTheme } from '@/theme/tokens';

type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  theme: AppTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    let active = true;
    void readThemePreference().then((stored) => {
      if (active) setPreference(stored);
    });
    return () => {
      active = false;
    };
  }, []);
  const isDark =
    preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      preference,
      setPreference: (next) => {
        setPreference(next);
        void saveThemePreference(next);
        if (next !== 'system') Appearance.setColorScheme(next);
      },
      theme: isDark ? darkTheme : lightTheme
    }),
    [isDark, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
