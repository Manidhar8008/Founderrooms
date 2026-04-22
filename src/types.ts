export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  email: string;
  createdAt: any;
}

export interface Room {
  id: string;
  name: string;
  tags: string[];
  creatorId: string;
  creatorName: string;
  createdAt: any;
  status: 'active' | 'ended';
  participantCount: number;
}

export interface Participant {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  joinedAt: any;
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: any;
}

export interface TranscriptLine {
  text: string;
  isFinal: boolean;
  timestamp: number;
}
