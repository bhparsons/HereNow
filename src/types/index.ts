export interface User {
  uid: string;
  displayName: string;
  username: string;
  photoUrl: string | null;
  createdAt: Date;
  email?: string;
  phone?: string;
  pushToken?: string;
  isPublic?: boolean;
  contactMethods?: {
    phone?: string;
    facetime?: string;
    whatsapp?: string;
  };
}

export type FrequencyGoal = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface FriendRecord {
  friendId: string;
  status: 'pending_sent' | 'pending_received' | 'accepted';
  createdAt: Date;
  displayName?: string;
  username?: string;
  photoUrl?: string | null;
  // Phase 1: Connection tracking
  lastConnectionAt: Date | null;
  connectionCount: number;
  // Phase 2: Priority & frequency goals
  frequencyGoal: FrequencyGoal | null;
  snoozedUntil: Date | null;
  notificationsEnabled?: boolean;
}

export interface Connection {
  id?: string;
  userIds: [string, string];
  timestamp: Date;
  type: 'overlap' | 'manual';
  reportedBy: string | null;
}

export interface Availability {
  userId: string;
  isAvailable: boolean;
  availableUntil: Date;
  startedAt: Date;
  // Phase 3: Staggered disclosure
  tierRevealTimes?: { [tier: number]: Date };
  friendTiers?: { [friendId: string]: number };
  // Phase 5: In a conversation
  inConversation?: boolean;
  inConversationWith?: string | null;
}

export interface AvailableFriend {
  userId: string;
  displayName: string;
  username: string;
  photoUrl: string | null;
  availableUntil: Date;
  startedAt: Date;
  // Phase 3: Tier info
  tier?: number;
  // Phase 5: Conversation status
  inConversation?: boolean;
  // Phase 6: Contact methods for call initiation
  contactMethods?: {
    phone?: string;
    facetime?: string;
    whatsapp?: string;
  };
}

export type DurationOption = {
  label: string;
  minutes: number;
};

export type SnoozeDuration = {
  label: string;
  days: number;
};
