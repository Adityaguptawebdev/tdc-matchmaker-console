import type { MatchmakerRole } from '@tdc/shared';

/**
 * Demo accounts (fictional). The shared demo password is shown on the login page only when
 * SHOW_DEMO_CREDENTIALS=true (default in development). Change or remove these for any real deployment.
 */
export const DEMO_PASSWORD = 'TDCdemo@2026';

export const DEMO_USERS: {
  id: string;
  name: string;
  username: string;
  email: string;
  role: MatchmakerRole;
  title: string;
}[] = [
  {
    id: 'mm_ananya',
    name: 'Ananya Rao',
    username: 'ananya',
    email: 'ananya.rao@tdc.example',
    role: 'matchmaker',
    title: 'Senior Matchmaker',
  },
  {
    id: 'mm_rohan',
    name: 'Rohan Mehta',
    username: 'rohan',
    email: 'rohan.mehta@tdc.example',
    role: 'matchmaker',
    title: 'Matchmaker',
  },
  {
    id: 'mm_priya',
    name: 'Priya Nair',
    username: 'priya',
    email: 'priya.nair@tdc.example',
    role: 'lead',
    title: 'Head of Matchmaking',
  },
];
