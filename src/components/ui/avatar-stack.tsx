import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type AvatarStackProps = {
  members: { id: string; label: string }[];
  max?: number;
};

export function AvatarStack({ members, max = 4 }: AvatarStackProps) {
  const { theme } = useTheme();
  const visible = members.slice(0, max);
  const remaining = members.length - visible.length;

  return (
    <View accessibilityLabel={`${members.length} group members`} style={styles.stack}>
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.avatar,
            {
              backgroundColor: index % 2 === 0 ? theme.accentMuted : theme.surfaceMuted,
              borderColor: theme.surfaceElevated,
              marginLeft: index === 0 ? 0 : -9
            }
          ]}
        >
          <Text style={[styles.initial, { color: theme.text }]}>
            {member.label.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      ))}
      {remaining > 0 ? (
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: theme.primary,
              borderColor: theme.surfaceElevated,
              marginLeft: -9
            }
          ]}
        >
          <Text style={[styles.initial, { color: theme.onPrimary }]}>+{remaining}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: tokens.radius.pill
  },
  initial: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black
  }
});
