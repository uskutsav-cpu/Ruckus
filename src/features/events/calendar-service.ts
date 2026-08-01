import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

import type { EventDetail } from '@/features/events/event-types';

export async function addEventToDeviceCalendar(
  event: EventDetail
): Promise<'opened' | 'unsupported' | 'denied'> {
  if (Platform.OS === 'web') return 'unsupported';
  const permission = await Calendar.requestCalendarPermissions(true);
  if (permission.status !== 'granted') return 'denied';

  const options = {
    title: event.title,
    startDate: new Date(event.startsAt),
    endDate: new Date(event.endsAt),
    location: event.venueName,
    notes: `${event.description}\n\n${event.locationDescription}`
  };

  if (Platform.OS === 'ios') {
    const calendar = Calendar.getDefaultCalendarSync();
    await calendar.addEventWithForm(options);
    return 'opened';
  }

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const calendar =
    calendars.find((candidate) => candidate.allowsModifications && candidate.isPrimary) ??
    calendars.find((candidate) => candidate.allowsModifications);
  if (!calendar) return 'unsupported';
  await calendar.addEventWithForm(options);
  return 'opened';
}
