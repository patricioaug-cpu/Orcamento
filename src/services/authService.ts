export type UserStatus = "trial" | "liberado" | "bloqueado";

export interface SafeUser {
  id: string;
  nome: string;
  email: string;
  status: UserStatus;
  trial_inicio: string;
  trial_fim: string;
  created_at: string;
  device_serial?: string;
  last_login?: string;
}

export interface UserTrialInfo {
  status: UserStatus;
  isAdmin: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialInicio: string;
  trialFim: string;
  deviceBound: boolean;
  message?: string;
}

export interface AdminUserListItem extends SafeUser {
  loginCount: number;
  trialInfo: UserTrialInfo;
}

export interface LoginRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  data_hora: string;
  data_hora_formatada: string;
  ip: string;
  device_serial: string;
  notificacao_enviada: boolean;
}

export interface EmailNotificationLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  status: "enviado_smtp" | "registrado_servidor" | "falha";
}

const STORAGE_USER_KEY = "calcpro_authenticated_user";
const STORAGE_DEVICE_KEY = "calcpro_device_serial";
export const ADMIN_EMAIL = "patricioaug@gmail.com";

// Get or generate persistent device serial
export function getOrCreateDeviceSerial(): string {
  try {
    let serial = localStorage.getItem(STORAGE_DEVICE_KEY);
    if (!serial) {
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      const timePart = Date.now().toString(36).toUpperCase();
      serial = `SN-${timePart}-${randomPart}`;
      localStorage.setItem(STORAGE_DEVICE_KEY, serial);
    }
    return serial;
  } catch {
    return "SN-FALLBACK-DEV01";
  }
}

// Session management
export function getStoredUser(): SafeUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: SafeUser): void {
  try {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Erro ao persistir sessão do usuário:", err);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_USER_KEY);
  } catch (err) {
    console.error("Erro ao remover sessão do usuário:", err);
  }
}

export function isUserAdmin(user?: SafeUser | null): boolean {
  if (!user?.email) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// API Client calls
export const authApi = {
  // Register
  register: async (nome: string, email: string, password: string): Promise<{ user: SafeUser; trialInfo: UserTrialInfo }> => {
    const deviceSerial = getOrCreateDeviceSerial();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, password, deviceSerial }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao cadastrar usuário.");
    }
    setStoredUser(data.user);
    return data;
  },

  // Login
  login: async (email: string, password: string): Promise<{ user: SafeUser; trialInfo: UserTrialInfo }> => {
    const deviceSerial = getOrCreateDeviceSerial();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, deviceSerial }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao efetuar login. Verifique suas credenciais.");
    }
    setStoredUser(data.user);
    return data;
  },

  // Forgot password
  forgotPassword: async (
    email: string
  ): Promise<{
    message: string;
    emailSent?: boolean;
    directReset?: boolean;
    token?: string;
    code?: string;
  }> => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao solicitar recuperação de senha.");
    }
    return data;
  },

  // Reset password
  resetPassword: async (
    params:
      | { email: string; code?: string; token?: string; newPassword: string }
      | string,
    maybeCode?: string,
    maybeNewPassword?: string
  ): Promise<{ message: string }> => {
    let payload: { email: string; code?: string; token?: string; newPassword: string };
    if (typeof params === "string") {
      payload = {
        email: params,
        code: maybeCode,
        newPassword: maybeNewPassword || "",
      };
    } else {
      payload = params;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao redefinir senha.");
    }
    return data;
  },

  // Check trial status
  checkTrial: async (userId: string, userEmail?: string): Promise<UserTrialInfo> => {
    // Se for o administrador patricioaug@gmail.com, o acesso é permanente e não há contagem de trial
    if (userEmail && userEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return {
        status: "liberado",
        isAdmin: true,
        isExpired: false,
        daysRemaining: -1,
        trialInicio: "",
        trialFim: "",
        deviceBound: false,
        message: "Acesso permanente de Administrador: sempre liberado, sem tempo de trial.",
      };
    }

    const deviceSerial = getOrCreateDeviceSerial();
    const res = await fetch("/api/auth/check-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userEmail, deviceSerial }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao verificar período de avaliação.");
    }
    return data.trialInfo;
  },

  // Admin APIs
  getAdminUsers: async (adminEmail: string): Promise<AdminUserListItem[]> => {
    const res = await fetch("/api/admin/users", {
      headers: { "x-user-email": adminEmail },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao buscar lista de usuários.");
    }
    return data.users;
  },

  updateUserStatus: async (
    adminEmail: string,
    targetUserId: string,
    status: UserStatus,
    extendDays?: number
  ): Promise<SafeUser> => {
    const res = await fetch("/api/admin/users/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": adminEmail,
      },
      body: JSON.stringify({ targetUserId, status, extendDays }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao atualizar status do usuário.");
    }
    return data.user;
  },

  getAdminLogins: async (adminEmail: string): Promise<LoginRecord[]> => {
    const res = await fetch("/api/admin/logins", {
      headers: { "x-user-email": adminEmail },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao buscar histórico de logins.");
    }
    return data.logins;
  },

  getAdminNotifications: async (adminEmail: string): Promise<EmailNotificationLog[]> => {
    const res = await fetch("/api/admin/notifications", {
      headers: { "x-user-email": adminEmail },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao buscar registros de notificações.");
    }
    return data.notifications;
  },

  adminResetUserPassword: async (
    adminEmail: string,
    userId: string,
    newPassword: string
  ): Promise<void> => {
    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": adminEmail,
      },
      body: JSON.stringify({ adminEmail, userId, newPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao redefinir senha do usuário.");
    }
  },
};
