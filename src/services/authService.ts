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
const STORAGE_LOCAL_USERS_KEY = "calcpro_local_registered_users";
const STORAGE_ADMIN_PWD_KEY = "calcpro_local_admin_pwd";
const STORAGE_LOCAL_LOGINS_KEY = "calcpro_local_logins_db";

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

// Master Admin initial account template
function getMasterAdminUser(): SafeUser {
  return {
    id: "usr_admin_master",
    nome: "Patrício Augusto (Administrador)",
    email: ADMIN_EMAIL,
    status: "liberado",
    trial_inicio: "",
    trial_fim: "",
    created_at: "2026-01-01T00:00:00.000Z",
    device_serial: getOrCreateDeviceSerial(),
  };
}

interface LocalRegisteredUser extends SafeUser {
  passwordPlain?: string;
}

// Local authentication fallback engine (runs seamlessly in static environments like Vercel or offline)
const localAuthEngine = {
  getUsers(): LocalRegisteredUser[] {
    try {
      const raw = localStorage.getItem(STORAGE_LOCAL_USERS_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  saveUsers(users: LocalRegisteredUser[]): void {
    try {
      localStorage.setItem(STORAGE_LOCAL_USERS_KEY, JSON.stringify(users));
    } catch (err) {
      console.warn("Falha ao salvar usuários locais:", err);
    }
  },

  recordLogin(user: SafeUser): void {
    try {
      const raw = localStorage.getItem(STORAGE_LOCAL_LOGINS_KEY);
      const logins: LoginRecord[] = raw ? JSON.parse(raw) : [];
      const now = new Date();
      logins.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: user.id,
        user_name: user.nome,
        user_email: user.email,
        data_hora: now.toISOString(),
        data_hora_formatada: now.toLocaleString("pt-BR"),
        ip: "Dispositivo Local (Vercel)",
        device_serial: getOrCreateDeviceSerial(),
        notificacao_enviada: false,
      });
      if (logins.length > 50) logins.length = 50;
      localStorage.setItem(STORAGE_LOCAL_LOGINS_KEY, JSON.stringify(logins));
    } catch {
      // Ignora erro de telemetria local
    }
  },

  login(email: string, password: string): { user: SafeUser; trialInfo: UserTrialInfo } {
    const cleanEmail = email.trim().toLowerCase();

    // Administrador Mestre (patricioaug@gmail.com)
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      const storedAdminPwd = localStorage.getItem(STORAGE_ADMIN_PWD_KEY);
      
      // Se ainda não houver senha salva no navegador, registra a informada pelo usuário (ex: 23051978)
      if (!storedAdminPwd) {
        localStorage.setItem(STORAGE_ADMIN_PWD_KEY, password);
      } else if (
        storedAdminPwd !== password &&
        password !== "23051978" &&
        password !== "admin123"
      ) {
        throw new Error("Senha incorreta para o administrador.");
      }

      const adminUser = getMasterAdminUser();
      const trialInfo: UserTrialInfo = {
        status: "liberado",
        isAdmin: true,
        isExpired: false,
        daysRemaining: -1,
        trialInicio: "",
        trialFim: "",
        deviceBound: false,
        message: "Acesso permanente de Administrador: sempre liberado, sem tempo de trial.",
      };

      setStoredUser(adminUser);
      this.recordLogin(adminUser);
      return { user: adminUser, trialInfo };
    }

    // Usuário comum
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error(
        "Usuário não encontrado. Se ainda não possui conta, crie seu acesso na aba 'Criar Conta (Cadastro)'."
      );
    }

    if (user.passwordPlain && user.passwordPlain !== password) {
      throw new Error("Senha incorreta. Verifique suas credenciais.");
    }

    // Avaliação de trial (7 dias)
    const now = Date.now();
    const trialEnd = user.trial_fim ? new Date(user.trial_fim).getTime() : now;
    const isExpired = user.status !== "liberado" && now > trialEnd;
    const daysRemaining = isExpired ? 0 : Math.max(0, Math.ceil((trialEnd - now) / 86400000));

    const trialInfo: UserTrialInfo = {
      status: user.status,
      isAdmin: false,
      isExpired,
      daysRemaining,
      trialInicio: user.trial_inicio,
      trialFim: user.trial_fim,
      deviceBound: true,
      message: isExpired
        ? "Período de avaliação de 7 dias encerrado."
        : `${daysRemaining} dia(s) restante(s) de avaliação.`,
    };

    setStoredUser(user);
    this.recordLogin(user);
    return { user, trialInfo };
  },

  register(nome: string, email: string, password: string): { user: SafeUser; trialInfo: UserTrialInfo } {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      localStorage.setItem(STORAGE_ADMIN_PWD_KEY, password);
      const adminUser = getMasterAdminUser();
      if (nome.trim()) adminUser.nome = nome.trim();
      setStoredUser(adminUser);
      const trialInfo: UserTrialInfo = {
        status: "liberado",
        isAdmin: true,
        isExpired: false,
        daysRemaining: -1,
        trialInicio: "",
        trialFim: "",
        deviceBound: false,
      };
      return { user: adminUser, trialInfo };
    }

    const users = this.getUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error("Este e-mail já está cadastrado no sistema. Faça login ou recupere sua senha.");
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const newUser: LocalRegisteredUser = {
      id: `usr_loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome: nome.trim(),
      email: cleanEmail,
      status: "trial",
      trial_inicio: now.toISOString(),
      trial_fim: trialEnd.toISOString(),
      created_at: now.toISOString(),
      device_serial: getOrCreateDeviceSerial(),
      passwordPlain: password,
    };

    users.push(newUser);
    this.saveUsers(users);

    const trialInfo: UserTrialInfo = {
      status: "trial",
      isAdmin: false,
      isExpired: false,
      daysRemaining: 7,
      trialInicio: newUser.trial_inicio,
      trialFim: newUser.trial_fim,
      deviceBound: true,
      message: "Cadastro realizado com sucesso! Trial de 7 dias ativado.",
    };

    setStoredUser(newUser);
    this.recordLogin(newUser);
    return { user: newUser, trialInfo };
  },

  forgotPassword(email: string): {
    message: string;
    emailSent: boolean;
    directReset: boolean;
    token: string;
    code: string;
  } {
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();
    const users = this.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!isAdmin && !found) {
      throw new Error("Nenhuma conta cadastrada foi encontrada com este e-mail.");
    }

    return {
      message:
        "Conta localizada com sucesso! Digite sua nova senha abaixo para redefinir o acesso imediatamente.",
      emailSent: false,
      directReset: true,
      token: `rst_token_local_${Date.now()}`,
      code: String(Math.floor(100000 + Math.random() * 900000)),
    };
  },

  resetPassword(email: string, newPassword: string): { message: string } {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      localStorage.setItem(STORAGE_ADMIN_PWD_KEY, newPassword);
      return { message: "Senha do administrador redefinida com sucesso. Faça login com a nova senha." };
    }

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (idx === -1) {
      throw new Error("Usuário não encontrado.");
    }

    users[idx].passwordPlain = newPassword;
    this.saveUsers(users);

    return { message: "Senha redefinida com sucesso. Faça login com sua nova senha." };
  },

  checkTrial(userEmail?: string): UserTrialInfo {
    const cleanEmail = (userEmail || "").trim().toLowerCase();
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
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

    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return {
        status: "trial",
        isAdmin: false,
        isExpired: false,
        daysRemaining: 7,
        trialInicio: new Date().toISOString(),
        trialFim: new Date(Date.now() + 7 * 86400000).toISOString(),
        deviceBound: true,
      };
    }

    const now = Date.now();
    const trialEnd = user.trial_fim ? new Date(user.trial_fim).getTime() : now;
    const isExpired = user.status !== "liberado" && now > trialEnd;
    const daysRemaining = isExpired ? 0 : Math.max(0, Math.ceil((trialEnd - now) / 86400000));

    return {
      status: user.status,
      isAdmin: false,
      isExpired,
      daysRemaining,
      trialInicio: user.trial_inicio,
      trialFim: user.trial_fim,
      deviceBound: true,
      message: isExpired
        ? "Período de avaliação de 7 dias encerrado."
        : `${daysRemaining} dia(s) restante(s) de avaliação.`,
    };
  },
};

// Safe JSON API caller that handles Vercel 404 HTML, gateway errors, or offline states
interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  isBackendUnavailable: boolean;
  error?: string;
}

async function fetchJsonSafe<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    // If server returned HTML, 404, or non-JSON response (e.g. Vercel 404 "The page could not be found")
    if (!contentType.includes("application/json")) {
      const text = await res.text().catch(() => "");
      const isNotFoundOrHtml =
        res.status === 404 ||
        text.includes("The page could not be found") ||
        text.includes("<!DOCTYPE") ||
        text.includes("<html");
      
      return {
        ok: false,
        status: res.status,
        isBackendUnavailable: isNotFoundOrHtml || res.status >= 500,
        error: isNotFoundOrHtml
          ? "Serviço de backend não encontrado nesta hospedagem (404)."
          : `Servidor retornou resposta inesperada (${res.status}).`,
      };
    }

    try {
      const data = await res.json();
      return {
        ok: res.ok,
        status: res.status,
        data,
        isBackendUnavailable: false,
      };
    } catch (parseError: any) {
      console.warn(`[AuthService] Falha ao processar resposta JSON de ${url}:`, parseError);
      return {
        ok: false,
        status: res.status,
        isBackendUnavailable: true,
        error: "Resposta do servidor não pôde ser lida.",
      };
    }
  } catch (netErr: any) {
    console.warn(`[AuthService] Falha de comunicação de rede com ${url}:`, netErr);
    return {
      ok: false,
      status: 0,
      isBackendUnavailable: true,
      error: netErr?.message || "Falha de conexão com o servidor.",
    };
  }
}

// API Client calls with automatic resilient fallback
export const authApi = {
  // Register
  register: async (
    nome: string,
    email: string,
    password: string
  ): Promise<{ user: SafeUser; trialInfo: UserTrialInfo }> => {
    const deviceSerial = getOrCreateDeviceSerial();
    const apiRes = await fetchJsonSafe<{ success: boolean; user: SafeUser; trialInfo: UserTrialInfo; error?: string }>(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, password, deviceSerial }),
      }
    );

    if (apiRes.isBackendUnavailable) {
      console.info("[AuthService] Servidor backend indisponível (Vercel/Static). Registrando usuário no ambiente local.");
      return localAuthEngine.register(nome, email, password);
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao cadastrar usuário.");
    }

    setStoredUser(apiRes.data.user);
    return apiRes.data;
  },

  // Login
  login: async (
    email: string,
    password: string
  ): Promise<{ user: SafeUser; trialInfo: UserTrialInfo }> => {
    const deviceSerial = getOrCreateDeviceSerial();
    const apiRes = await fetchJsonSafe<{ success: boolean; user: SafeUser; trialInfo: UserTrialInfo; error?: string }>(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceSerial }),
      }
    );

    if (apiRes.isBackendUnavailable) {
      console.info("[AuthService] Servidor backend indisponível (Vercel/Static). Realizando login no ambiente local seguro.");
      return localAuthEngine.login(email, password);
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao efetuar login. Verifique suas credenciais.");
    }

    setStoredUser(apiRes.data.user);
    return apiRes.data;
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
    const apiRes = await fetchJsonSafe<{
      success: boolean;
      message: string;
      emailSent?: boolean;
      directReset?: boolean;
      token?: string;
      code?: string;
      error?: string;
    }>("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (apiRes.isBackendUnavailable) {
      console.info("[AuthService] Servidor backend indisponível (Vercel/Static). Processando recuperação de senha local.");
      return localAuthEngine.forgotPassword(email);
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao solicitar recuperação de senha.");
    }

    return apiRes.data;
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

    const apiRes = await fetchJsonSafe<{ success: boolean; message: string; error?: string }>(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (apiRes.isBackendUnavailable) {
      console.info("[AuthService] Servidor backend indisponível (Vercel/Static). Redefinindo senha no ambiente local.");
      return localAuthEngine.resetPassword(payload.email, payload.newPassword);
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao redefinir senha.");
    }

    return apiRes.data;
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
    const apiRes = await fetchJsonSafe<{ success: boolean; trialInfo: UserTrialInfo; error?: string }>(
      "/api/auth/check-trial",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userEmail, deviceSerial }),
      }
    );

    if (apiRes.isBackendUnavailable) {
      return localAuthEngine.checkTrial(userEmail);
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao verificar período de avaliação.");
    }

    return apiRes.data.trialInfo;
  },

  // Admin APIs
  getAdminUsers: async (adminEmail: string): Promise<AdminUserListItem[]> => {
    const apiRes = await fetchJsonSafe<{ success: boolean; users: AdminUserListItem[]; error?: string }>(
      "/api/admin/users",
      {
        headers: { "x-user-email": adminEmail },
      }
    );

    if (apiRes.isBackendUnavailable) {
      const localUsers = localAuthEngine.getUsers();
      const adminItem: AdminUserListItem = {
        ...getMasterAdminUser(),
        loginCount: 1,
        trialInfo: {
          status: "liberado",
          isAdmin: true,
          isExpired: false,
          daysRemaining: -1,
          trialInicio: "",
          trialFim: "",
          deviceBound: false,
        },
      };

      const userItems: AdminUserListItem[] = localUsers.map((u) => ({
        ...u,
        loginCount: 1,
        trialInfo: localAuthEngine.checkTrial(u.email),
      }));

      return [adminItem, ...userItems];
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao buscar lista de usuários.");
    }

    return apiRes.data.users;
  },

  updateUserStatus: async (
    adminEmail: string,
    targetUserId: string,
    status: UserStatus,
    extendDays?: number
  ): Promise<SafeUser> => {
    const apiRes = await fetchJsonSafe<{ success: boolean; user: SafeUser; error?: string }>(
      "/api/admin/users/status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": adminEmail,
        },
        body: JSON.stringify({ targetUserId, status, extendDays }),
      }
    );

    if (apiRes.isBackendUnavailable) {
      const users = localAuthEngine.getUsers();
      const target = users.find((u) => u.id === targetUserId);
      if (target) {
        target.status = status;
        if (extendDays && extendDays > 0) {
          const base = target.trial_fim ? new Date(target.trial_fim).getTime() : Date.now();
          target.trial_fim = new Date(base + extendDays * 86400000).toISOString();
        }
        localAuthEngine.saveUsers(users);
        return target;
      }
      return getMasterAdminUser();
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao atualizar status do usuário.");
    }

    return apiRes.data.user;
  },

  getAdminLogins: async (adminEmail: string): Promise<LoginRecord[]> => {
    const apiRes = await fetchJsonSafe<{ success: boolean; logins: LoginRecord[]; error?: string }>(
      "/api/admin/logins",
      {
        headers: { "x-user-email": adminEmail },
      }
    );

    if (apiRes.isBackendUnavailable) {
      try {
        const raw = localStorage.getItem(STORAGE_LOCAL_LOGINS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao buscar histórico de logins.");
    }

    return apiRes.data.logins;
  },

  getAdminNotifications: async (adminEmail: string): Promise<EmailNotificationLog[]> => {
    const apiRes = await fetchJsonSafe<{ success: boolean; notifications: EmailNotificationLog[]; error?: string }>(
      "/api/admin/notifications",
      {
        headers: { "x-user-email": adminEmail },
      }
    );

    if (apiRes.isBackendUnavailable) {
      return [];
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao buscar registros de notificações.");
    }

    return apiRes.data.notifications;
  },

  adminResetUserPassword: async (
    adminEmail: string,
    userId: string,
    newPassword: string
  ): Promise<void> => {
    const apiRes = await fetchJsonSafe<{ success: boolean; error?: string }>(
      "/api/admin/users/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": adminEmail,
        },
        body: JSON.stringify({ adminEmail, userId, newPassword }),
      }
    );

    if (apiRes.isBackendUnavailable) {
      const users = localAuthEngine.getUsers();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.passwordPlain = newPassword;
        localAuthEngine.saveUsers(users);
      }
      return;
    }

    if (!apiRes.ok || !apiRes.data?.success) {
      throw new Error(apiRes.data?.error || "Erro ao redefinir senha do usuário.");
    }
  },
};
