import React from 'react';
import RestaurantLayout from '@/features/restaurant/components/RestaurantLayout';
import NotificationPreferences from '../components/NotificationPreferences';

export default function NotificationSettingsPage() {
  return (
    <RestaurantLayout title="Notification Settings" description="Configure multi-channel message delivery preferences and template settings.">
      <div className="space-y-6 max-w-full">
        <NotificationPreferences />
      </div>
    </RestaurantLayout>
  );
}
