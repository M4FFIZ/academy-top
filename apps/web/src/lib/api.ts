import type { UserRole } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

type GradeFilters = {
  studentId?: string;
  groupId?: string;
  subjectId?: string;
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? "Ошибка запроса");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<User>("/auth/me", {}, token),

  dashboard: (token: string) => request<DashboardData>("/dashboard", {}, token),

  schedule: (token: string, from: string, to: string, groupId?: string) => {
    const params = new URLSearchParams({ from, to });
    if (groupId) params.set("groupId", groupId);
    return request<ScheduleLesson[]>(`/schedule?${params}`, {}, token);
  },

  gradeOptions: (token: string) =>
    request<GradeOptions>("/grades/options", {}, token),

  grades: (token: string, filters?: GradeFilters | string) => {
    const params = new URLSearchParams();
    if (typeof filters === "string") {
      params.set("studentId", filters);
    } else if (filters) {
      if (filters.studentId) params.set("studentId", filters.studentId);
      if (filters.groupId) params.set("groupId", filters.groupId);
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
    }
    const q = params.toString();
    return request<GradeEntry[]>(`/grades${q ? `?${q}` : ""}`, {}, token);
  },

  gradesSummary: (token: string, filters?: GradeFilters | string) => {
    const params = new URLSearchParams();
    if (typeof filters === "string") {
      params.set("studentId", filters);
    } else if (filters) {
      if (filters.studentId) params.set("studentId", filters.studentId);
      if (filters.groupId) params.set("groupId", filters.groupId);
      if (filters.subjectId) params.set("subjectId", filters.subjectId);
    }
    const q = params.toString();
    return request<GradeSummary[]>(`/grades/summary${q ? `?${q}` : ""}`, {}, token);
  },

  attendance: (token: string, studentId?: string) => {
    const q = studentId ? `?studentId=${studentId}` : "";
    return request<AttendanceEntry[]>(`/attendance${q}`, {}, token);
  },

  attendanceStats: (token: string, studentId?: string) => {
    const q = studentId ? `?studentId=${studentId}` : "";
    return request<AttendanceStats>(`/attendance/stats${q}`, {}, token);
  },

  journalSession: (token: string, groupId: string, subjectId: string, date: string) =>
    request<JournalSession>(
      `/journal/session?groupId=${groupId}&subjectId=${subjectId}&date=${date}`,
      {},
      token,
    ),

  saveJournal: (
    token: string,
    data: {
      lessonId: string;
      groupId: string;
      subjectId: string;
      entries: { studentId: string; grade?: number; attendance?: string }[];
    },
  ) =>
    request<{ success: boolean }>("/journal/session", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  chats: (token: string) => request<ChatRoomItem[]>(`/chats`, {}, token),

  chatSummary: (token: string) =>
    request<{ unreadMessages: number; pendingRequests: number; totalChats: number }>(
      `/chats/summary`,
      {},
      token,
    ),

  notifications: (token: string) => request<AppNotification[]>(`/notifications`, {}, token),

  markNotificationRead: (token: string, id: string) =>
    request(`/notifications/${id}/read`, { method: "PATCH" }, token),

  markAllNotificationsRead: (token: string) =>
    request(`/notifications/read-all`, { method: "POST" }, token),

  openDm: (token: string, userId: string) =>
    request<ChatRoomItem>("/chats/dm", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }, token),

  chatMessages: (token: string, roomId: string, cursor?: string) => {
    const q = cursor ? `?cursor=${cursor}` : "";
    return request<ChatMessage[]>(`/chats/${roomId}/messages${q}`, {}, token);
  },

  markChatRead: (token: string, roomId: string) =>
    request(`/chats/${roomId}/read`, { method: "POST" }, token),

  updateProfile: (token: string, data: { phone?: string; telegram?: string }) =>
    request("/profile", { method: "PATCH", body: JSON.stringify(data) }, token),

  setUsername: (token: string, username: string) =>
    request<{ username: string }>("/profile/username", {
      method: "PATCH",
      body: JSON.stringify({ username }),
    }, token),

  searchUsers: (token: string, q: string) =>
    request<SearchUser[]>(`/friends/search?q=${encodeURIComponent(q)}`, {}, token),

  getFriends: (token: string) => request<FriendUser[]>(`/friends`, {}, token),

  getFriendRequests: (token: string) =>
    request<FriendRequests>(`/friends/requests`, {}, token),

  sendFriendRequest: (token: string, username: string) =>
    request<{ id: string; user: FriendUser; status: string }>("/friends/request", {
      method: "POST",
      body: JSON.stringify({ username }),
    }, token),

  acceptFriendRequest: (token: string, id: string) =>
    request(`/friends/${id}/accept`, { method: "POST" }, token),

  declineFriendRequest: (token: string, id: string) =>
    request(`/friends/${id}/decline`, { method: "POST" }, token),

  removeFriend: (token: string, userId: string) =>
    request(`/friends/${userId}`, { method: "DELETE" }, token),

  adminUsers: (token: string, role?: string) => {
    const q = role ? `?role=${role}` : "";
    return request<AdminUser[]>(`/admin/users${q}`, {}, token);
  },

  adminGroups: (token: string) => request<AdminGroup[]>(`/admin/groups`, {}, token),

  groups: (token: string) => request<AdminGroup[]>(`/groups`, {}, token),

  adminSubjects: (token: string) => request<Subject[]>(`/admin/subjects`, {}, token),

  adminRooms: (token: string) => request<Room[]>(`/admin/rooms`, {}, token),

  adminTeachers: (token: string) => request<TeacherUser[]>(`/admin/teachers`, {}, token),

  adminAnalytics: (token: string) => request<AnalyticsItem[]>(`/admin/analytics`, {}, token),

  createLesson: (token: string, data: Record<string, string>) =>
    request<ScheduleLesson>("/schedule/lessons", {
      method: "POST",
      body: JSON.stringify(data),
    }, token),

  deleteLesson: (token: string, id: string) =>
    request(`/schedule/lessons/${id}`, { method: "DELETE" }, token),

  enrollStudent: (token: string, studentId: string, groupId: string) =>
    request("/admin/enroll", {
      method: "POST",
      body: JSON.stringify({ studentId, groupId }),
    }, token),

  blockUser: (token: string, id: string) =>
    request(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "blocked" }),
    }, token),
};

export interface User {
  id: string;
  email: string;
  username?: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  telegram?: string | null;
  group?: { id: string; name: string } | null;
}

export interface ScheduleLesson {
  id: string;
  groupId?: string;
  groupName?: string;
  subjectName: string;
  subjectColor: string;
  teacherName: string;
  roomName: string;
  lessonType: string;
  startsAt: string;
  endsAt: string;
}

export interface GradeEntry {
  id: string;
  studentId?: string;
  studentName?: string;
  subjectId?: string;
  date: string;
  subjectName: string;
  groupName?: string;
  topic?: string | null;
  value: number;
  gradeType: string;
}

export interface GradeSummary {
  subjectId: string;
  subjectName: string;
  color: string;
  average: number;
  count: number;
}

export interface GradeOptions {
  students: { id: string; displayName: string; groupName: string }[];
  subjects: { id: string; name: string; colorHex: string }[];
}

export interface AttendanceEntry {
  id: string;
  date: string;
  subjectName: string;
  status: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  percentage: number;
}

export interface DashboardData {
  group?: { id: string; name: string } | null;
  currentLesson?: ScheduleLesson | null;
  todayLessons?: ScheduleLesson[];
  stats?: { avgGrade: number | null; attendancePct: number | null };
  groups?: { id: string; name: string; subjectName: string }[];
  usersCount?: number;
  groupsCount?: number;
  lessonsToday?: number;
}

export interface JournalSession {
  lessonId: string | null;
  students: {
    studentId: string;
    name: string;
    grade: number | null;
    attendance: string | null;
  }[];
}

export interface ChatRoomItem {
  id: string;
  name: string;
  type: "group" | "private";
  peer?: FriendUser | null;
  lastMessage?: {
    content: string | null;
    createdAt: string;
    senderName: string;
  } | null;
  unread: number;
  updatedAt: string;
}

export interface FriendUser {
  id: string;
  username: string | null;
  displayName: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export interface SearchUser extends FriendUser {
  relation: "none" | "pending_sent" | "pending_received" | "friends";
  friendshipId: string | null;
}

export interface FriendRequests {
  incoming: { id: string; user: FriendUser; createdAt: string }[];
  outgoing: { id: string; user: FriendUser; createdAt: string }[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

/** @deprecated use ChatRoomItem */
export interface ChatRoom {
  id: string;
  name: string;
  type: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderUsername?: string | null;
  content: string | null;
  createdAt: string;
  isOwn?: boolean;
  isPinned?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  displayName: string;
  group?: { id: string; name: string } | null;
}

export interface AdminGroup {
  id: string;
  name: string;
  code?: string | null;
  status: string;
  subjects: { subject: Subject; teacher: { teacherProfile?: { firstName: string; lastName: string } } }[];
  _count: { students: number };
}

export interface Subject {
  id: string;
  name: string;
  shortName?: string | null;
  colorHex: string;
}

export interface Room {
  id: string;
  name: string;
  building?: string | null;
}

export interface TeacherUser {
  id: string;
  teacherProfile?: { firstName: string; lastName: string };
}

export interface AnalyticsItem {
  groupId: string;
  groupName: string;
  studentCount: number;
  avgGrade: number;
}

export { ApiError };
