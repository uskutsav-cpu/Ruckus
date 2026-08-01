import { StyleSheet, Text, type ColorValue, type TextStyle } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

const symbols = {
  back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  forward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  location: {
    ios: 'mappin.and.ellipse',
    android: 'location_on',
    web: 'location_on'
  },
  people: { ios: 'person.3', android: 'group', web: 'group' },
  person: { ios: 'person.crop.circle', android: 'person', web: 'person' },
  warning: {
    ios: 'exclamationmark.triangle',
    android: 'warning',
    web: 'warning'
  },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  qrCode: {
    ios: 'qrcode.viewfinder',
    android: 'qr_code_scanner',
    web: 'qr_code_scanner'
  },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  trophy: { ios: 'trophy', android: 'trophy', web: 'trophy' },
  star: { ios: 'star', android: 'star', web: 'star' },
  safety: { ios: 'shield', android: 'shield', web: 'shield' },
  rules: { ios: 'checklist', android: 'gavel', web: 'gavel' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  help: {
    ios: 'questionmark.circle',
    android: 'help',
    web: 'help'
  },
  document: { ios: 'doc.text', android: 'description', web: 'description' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  remove: { ios: 'trash', android: 'delete', web: 'delete' },
  error: {
    ios: 'exclamationmark.circle',
    android: 'error',
    web: 'error'
  },
  chat: { ios: 'bubble.left', android: 'chat_bubble', web: 'chat_bubble' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  discover: { ios: 'sparkles', android: 'explore', web: 'explore' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  bookmark: { ios: 'bookmark', android: 'bookmark', web: 'bookmark' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  list: { ios: 'list.bullet', android: 'view_list', web: 'view_list' },
  filter: {
    ios: 'line.3.horizontal.decrease',
    android: 'filter_list',
    web: 'filter_list'
  },
  organization: { ios: 'building.2', android: 'business', web: 'business' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  accessibility: {
    ios: 'accessibility',
    android: 'accessibility_new',
    web: 'accessibility_new'
  },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }
} as const satisfies Record<string, SymbolViewProps['name']>;

export type AppIconName = keyof typeof symbols;

const aliases: Record<string, AppIconName> = {
  '←': 'back',
  '↙': 'back',
  '↗': 'forward',
  '×': 'close',
  '✓': 'check',
  '◷': 'clock',
  '⌖': 'location',
  '●': 'people',
  '⚡': 'person',
  '!': 'warning',
  '↯': 'warning',
  '↻': 'refresh',
  '⌁': 'qrCode',
  '#': 'trophy',
  '◎': 'safety',
  '§': 'rules',
  i: 'info',
  '?': 'help',
  '¶': 'document',
  '+': 'add'
};

type AppIconProps = {
  name: AppIconName | string;
  color: ColorValue;
  size?: number;
  fallbackStyle?: TextStyle;
};

export function AppIcon({ name, color, size = 20, fallbackStyle }: AppIconProps) {
  const resolvedName = name in symbols ? (name as AppIconName) : aliases[name];
  if (!resolvedName) {
    return (
      <Text
        aria-hidden
        style={[styles.fallback, { color, fontSize: size }, fallbackStyle]}
      >
        {name}
      </Text>
    );
  }

  return (
    <SymbolView
      name={symbols[resolvedName]}
      size={size}
      tintColor={color}
      fallback={
        <Text aria-hidden style={[styles.fallback, { color, fontSize: size }]}>
          {name}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center'
  }
});
