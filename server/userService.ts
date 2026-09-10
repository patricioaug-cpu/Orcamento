import fs from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { resolveDataPath } from "./dataPath";

export const ADMIN_EMAIL = "patricioaug@gmail.com";
const DB_FILE_PATH = resolveDataPath("calcpro_database.json");
const TMP_DB_PATH = path.join("/tmp", "calcpro_database.json");

// Helper to safely get SMTP transporter without throwing DNS or connection errors
function getSafeSmtpTransporter(): {
  transporter: any | null;
  from: string;
  reason?: string;
} {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const rawPort = (process.env.SMTP_PORT || "").trim();
  const port = parseInt(rawPort || "587", 10);

  if (!host || !user || !pass) {
    return { transporter: null, from: "", reason: "SMTP não configurado (variáveis ausentes no ambiente)." };
  }

  // Check if host is valid (not an email address, no spaces, no '@', has dots or is localhost)
  if (host.includes("@") || /\s/.test(host) || (!host.includes(".") && host.toLowerCase() !== "localhost")) {
    return {
      transporter: null,
      from: "",
      reason: `Host SMTP inválido ("${host}"). O host SMTP deve ser um domínio válido (ex: smtp.gmail.com).`,
    };
  }

  if (isNaN(port) || port <= 0 || port > 65535) {
    return {
      transporter: null,
      from: "",
      reason: `Porta SMTP inválida ("${rawPort}"). Utilize 587 (TLS) ou 465 (SSL).`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });
    const from = process.env.SMTP_FROM || `"CalcPro Suporte" <${user}>`;
    return { transporter, from };
  } catch (err: any) {
    return { transporter: null, from: "", reason: `Falha na configuração do transporte SMTP: ${err.message}` };
  }
}

// Safely send email without crashing or generating unhandled DNS/network exceptions
async function sendEmailSafely(
  to: string,
  subject: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const { transporter, from, reason } = getSafeSmtpTransporter();
  if (!transporter) {
    // Only log once if non-empty invalid config was provided
    if (reason && !reason.includes("variáveis ausentes")) {
      console.log(`[SMTP INFO] ${reason}`);
    }
    return { success: false, error: reason };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });
    console.log(`[SMTP] E-mail enviado com sucesso para ${to}`);
    return { success: true };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.log(`[SMTP AVISO] Envio via SMTP não concluído (${errMsg}). Registro preservado no banco de dados.`);
    return { success: false, error: errMsg };
  }
}

export type UserStatus = "trial" | "liberado" | "bloqueado";

export interface User {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  status: UserStatus;
  trial_inicio: string; // ISO string
  trial_fim: string; // ISO string
  created_at: string;
  last_login?: string;
  device_serial?: string;
}

export interface LoginRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  data_hora: string; // ISO string
  data_hora_formatada: string;
  ip: string;
  device_serial: string;
  notificacao_enviada: boolean;
}

export interface CalculoRecord {
  id: string;
  user_id: string;
  user_email?: string;
  dados_json: any;
  carga_termica: string | number;
  metodo: string;
  data: string;
}

export interface DeviceTrialRecord {
  device_serial: string;
  first_trial_inicio: string;
  first_trial_fim: string;
  first_user_id: string;
  first_user_email: string;
}

export interface PasswordResetCode {
  email: string;
  code: string;
  expires_at: number;
}

export interface EmailNotificationLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  status: "enviado_smtp" | "registrado_servidor" | "falha";
}

export interface DatabaseSchema {
  users: User[];
  logins: LoginRecord[];
  calculos: CalculoRecord[];
  device_trials: DeviceTrialRecord[];
  reset_codes: PasswordResetCode[];
  email_notifications: EmailNotificationLog[];
}

// In-memory cache synced with disk
let dbState: DatabaseSchema = {
  users: [],
  logins: [],
  calculos: [],
  device_trials: [],
  reset_codes: [],
  email_notifications: [],
};

// Password hashing utility using crypto HMAC-SHA256 with salt
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const computedHash = crypto.createHmac("sha256", salt).update(password).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(computedHash, "hex"));
  } catch {
    return false;
  }
}

// Ensure database file exists
function loadDatabase(): DatabaseSchema {
  try {
    const targetPath = fs.existsSync(TMP_DB_PATH) ? TMP_DB_PATH : DB_FILE_PATH;
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, "utf-8");
      const parsed = JSON.parse(content);
      dbState = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        logins: Array.isArray(parsed.logins) ? parsed.logins : [],
        calculos: Array.isArray(parsed.calculos) ? parsed.calculos : [],
        device_trials: Array.isArray(parsed.device_trials) ? parsed.device_trials : [],
        reset_codes: Array.isArray(parsed.reset_codes) ? parsed.reset_codes : [],
        email_notifications: Array.isArray(parsed.email_notifications) ? parsed.email_notifications : [],
      };
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error("[Database] Erro ao carregar banco de dados:", err);
  }

  // Pre-seed or enforce Admin user (permanent unlimited access, no trial)
  seedAdminUserIfNotExists();

  // Enforce permanent unlimited status for admin on every database load
  const adminInDb = dbState.users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (adminInDb) {
    adminInDb.status = "liberado";
    adminInDb.trial_inicio = "";
    adminInDb.trial_fim = "";
  }

  return dbState;
}

function saveDatabase(): void {
  const jsonStr = JSON.stringify(dbState, null, 2);
  let saved = false;
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, jsonStr, "utf-8");
    saved = true;
  } catch {
    // Expected on read-only file systems like Vercel Serverless Function (/var/task)
  }

  if (!saved) {
    try {
      fs.writeFileSync(TMP_DB_PATH, jsonStr, "utf-8");
    } catch {
      // In-memory dbState is always preserved during execution
    }
  }
}

function seedAdminUserIfNotExists(): void {
  const existingAdmin = dbState.users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (existingAdmin) {
    // Ensure admin is ALWAYS liberado and has no trial counting
    existingAdmin.status = "liberado";
    existingAdmin.trial_inicio = "";
    existingAdmin.trial_fim = "";
    saveDatabase();
  } else {
    const now = new Date();
    const adminUser: User = {
      id: "usr_admin_master",
      nome: "Administrador CalcPro",
      email: ADMIN_EMAIL,
      senha_hash: hashPassword("admin123"), // Default password, can be changed via Reset
      status: "liberado",
      trial_inicio: "",
      trial_fim: "",
      created_at: now.toISOString(),
    };
    dbState.users.push(adminUser);
    saveDatabase();
    console.log(`[Database] Administrador mestre (${ADMIN_EMAIL}) inicializado no sistema com acesso vitalício sem trial.`);
  }
}

// Initial DB load on startup
loadDatabase();

// Email notification dispatcher for logins
export async function sendLoginNotification(user: User, ip: string, deviceSerial: string): Promise<boolean> {
  const now = new Date();
  const dataHoraFormatada = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const statusDisplay = isAdmin ? "ADMINISTRADOR (ACESSO VITALÍCIO / SEM CONTABILIZAÇÃO DE TRIAL)" : user.status.toUpperCase();

  const subject = `[CalcPro] Novo Login Realizado - ${user.nome}`;
  const bodyText = `
Olá, Patricio!

Um novo login foi registrado no aplicativo CalcPro:

- Nome do Usuário: ${user.nome}
- E-mail: ${user.email}
- Data e Hora: ${dataHoraFormatada}
- Status da Conta: ${statusDisplay}
- Endereço IP: ${ip}
- Número de Série do Dispositivo: ${deviceSerial || "Não identificado"}

---
Notificação automática gerada pelo servidor CalcPro.
`.trim();

  console.log("==================================================================");
  console.log("📬 [NOTIFICAÇÃO DE LOGIN ENVIADA PARA O ADMINISTRADOR]");
  console.log(`Destinatário: ${ADMIN_EMAIL}`);
  console.log(`Nome:         ${user.nome}`);
  console.log(`E-mail:       ${user.email}`);
  console.log(`Data e Hora:  ${dataHoraFormatada}`);
  console.log(`IP:           ${ip}`);
  console.log(`Dispositivo:  ${deviceSerial || "N/A"}`);
  console.log("==================================================================");

  let status: "enviado_smtp" | "registrado_servidor" | "falha" = "registrado_servidor";

  const emailRes = await sendEmailSafely(ADMIN_EMAIL, subject, bodyText);
  if (emailRes.success) {
    status = "enviado_smtp";
  }

  // Record email notification in database log
  dbState.email_notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient: ADMIN_EMAIL,
    subject,
    body: bodyText,
    timestamp: now.toISOString(),
    status,
  });

  // Keep last 200 notifications
  if (dbState.email_notifications.length > 200) {
    dbState.email_notifications = dbState.email_notifications.slice(0, 200);
  }
  saveDatabase();

  return true;
}

// User Trial calculation
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

export function evaluateUserTrial(user: User, deviceSerial?: string): UserTrialInfo {
  const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (isAdmin) {
    // Para o administrador patricioaug@gmail.com, não há contabilização de tempo de trial e o acesso é sempre liberado
    return {
      status: "liberado",
      isAdmin: true,
      isExpired: false,
      daysRemaining: -1, // Sem contagem regressiva de trial
      trialInicio: "",
      trialFim: "", // Vitalício e sem término
      deviceBound: false,
      message: "Acesso permanente de Administrador: sempre liberado, sem tempo de trial.",
    };
  }

  if (user.status === "liberado") {
    return {
      status: "liberado",
      isAdmin: false,
      isExpired: false,
      daysRemaining: 9999,
      trialInicio: user.trial_inicio,
      trialFim: user.trial_fim,
      deviceBound: false,
    };
  }

  if (user.status === "bloqueado") {
    return {
      status: "bloqueado",
      isAdmin: false,
      isExpired: true,
      daysRemaining: 0,
      trialInicio: user.trial_inicio,
      trialFim: user.trial_fim,
      deviceBound: false,
      message: "Seu acesso está bloqueado. Entre em contato pelo e mail patricioaug@gmail.com para continuar.",
    };
  }

  // For trial users:
  const now = new Date().getTime();
  let trialFimTime = new Date(user.trial_fim).getTime();
  let deviceBound = false;

  // Check if device already has a previous trial registered
  if (deviceSerial) {
    const devRecord = dbState.device_trials.find((d) => d.device_serial === deviceSerial);
    if (devRecord) {
      const devTrialFimTime = new Date(devRecord.first_trial_fim).getTime();
      // Device trial takes precedence if it expired earlier
      if (devTrialFimTime < trialFimTime) {
        trialFimTime = devTrialFimTime;
        deviceBound = true;
      }
    }
  }

  const msRemaining = trialFimTime - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isExpired = msRemaining <= 0;

  return {
    status: "trial",
    isAdmin: false,
    isExpired,
    daysRemaining,
    trialInicio: user.trial_inicio,
    trialFim: new Date(trialFimTime).toISOString(),
    deviceBound,
    message: isExpired
      ? "Seu período de avaliação terminou. Entre em contato pelo e mail patricioaug@gmail.com para continuar."
      : undefined,
  };
}

// Database Operations
export const UserService = {
  // Register new user
  registerUser: async (params: {
    nome: string;
    email: string;
    password: string;
    deviceSerial?: string;
    ip?: string;
  }): Promise<{ user: User; trialInfo: UserTrialInfo }> => {
    loadDatabase();

    const emailNorm = params.email.trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes("@")) {
      throw new Error("E-mail inválido.");
    }
    if (!params.password || params.password.length < 6) {
      throw new Error("A senha deve conter no mínimo 6 caracteres.");
    }
    if (!params.nome || params.nome.trim().length < 2) {
      throw new Error("Por favor, informe seu nome completo.");
    }

    // Check duplicate email
    const existing = dbState.users.find((u) => u.email.toLowerCase() === emailNorm);
    if (existing) {
      throw new Error("Este e-mail já está cadastrado no sistema. Utilize a opção de login ou recuperação de senha.");
    }

    const now = new Date();
    const isAdmin = emailNorm === ADMIN_EMAIL.toLowerCase();

    // 7 days trial period starting now on the server
    let trialInicio = now.toISOString();
    let trialFim = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Device serial binding
    const deviceSerial = params.deviceSerial || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const existingDeviceTrial = dbState.device_trials.find((d) => d.device_serial === deviceSerial);

    if (existingDeviceTrial && !isAdmin) {
      // Inherit original device trial dates to avoid trial reset on the same device
      trialInicio = existingDeviceTrial.first_trial_inicio;
      trialFim = existingDeviceTrial.first_trial_fim;
    } else if (!isAdmin) {
      // Register device trial
      dbState.device_trials.push({
        device_serial: deviceSerial,
        first_trial_inicio: trialInicio,
        first_trial_fim: trialFim,
        first_user_id: `usr_${Date.now()}`,
        first_user_email: emailNorm,
      });
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome: params.nome.trim(),
      email: emailNorm,
      senha_hash: hashPassword(params.password),
      status: isAdmin ? "liberado" : "trial",
      trial_inicio: trialInicio,
      trial_fim: trialFim,
      created_at: now.toISOString(),
      device_serial: deviceSerial,
      last_login: now.toISOString(),
    };

    dbState.users.push(newUser);
    saveDatabase();

    // Record login
    const ip = params.ip || "127.0.0.1";
    const dataHoraFormatada = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const loginRec: LoginRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: newUser.id,
      user_name: newUser.nome,
      user_email: newUser.email,
      data_hora: now.toISOString(),
      data_hora_formatada: dataHoraFormatada,
      ip,
      device_serial: deviceSerial,
      notificacao_enviada: true,
    };
    dbState.logins.unshift(loginRec);
    saveDatabase();

    // Trigger automatic notification email
    sendLoginNotification(newUser, ip, deviceSerial).catch(console.error);

    const trialInfo = evaluateUserTrial(newUser, deviceSerial);
    return { user: newUser, trialInfo };
  },

  // Login user
  loginUser: async (params: {
    email: string;
    password: string;
    deviceSerial?: string;
    ip?: string;
  }): Promise<{ user: User; trialInfo: UserTrialInfo }> => {
    loadDatabase();

    const emailNorm = params.email.trim().toLowerCase();
    const user = dbState.users.find((u) => u.email.toLowerCase() === emailNorm);
    if (!user) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const isMatch = verifyPassword(params.password, user.senha_hash);
    if (!isMatch) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const now = new Date();
    const ip = params.ip || "127.0.0.1";
    const deviceSerial = params.deviceSerial || user.device_serial || `dev_default`;
    const dataHoraFormatada = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // Update user device and last login
    user.last_login = now.toISOString();
    user.device_serial = deviceSerial;

    // Check device trial binding
    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (!isAdmin && deviceSerial) {
      const devRecord = dbState.device_trials.find((d) => d.device_serial === deviceSerial);
      if (!devRecord) {
        dbState.device_trials.push({
          device_serial: deviceSerial,
          first_trial_inicio: user.trial_inicio,
          first_trial_fim: user.trial_fim,
          first_user_id: user.id,
          first_user_email: user.email,
        });
      }
    }

    // Record login
    const loginRec: LoginRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      user_name: user.nome,
      user_email: user.email,
      data_hora: now.toISOString(),
      data_hora_formatada: dataHoraFormatada,
      ip,
      device_serial: deviceSerial,
      notificacao_enviada: true,
    };
    dbState.logins.unshift(loginRec);

    // Keep last 500 logins
    if (dbState.logins.length > 500) {
      dbState.logins = dbState.logins.slice(0, 500);
    }
    saveDatabase();

    // A cada login: ✅ Enviar e-mail automático para: patricioaug@gmail.com
    sendLoginNotification(user, ip, deviceSerial).catch(console.error);

    const trialInfo = evaluateUserTrial(user, deviceSerial);
    return { user, trialInfo };
  },

  // Forgot Password: generate recovery code or token
  generatePasswordResetCode: async (
    email: string
  ): Promise<{ code: string; token: string; emailSent: boolean }> => {
    loadDatabase();
    const emailNorm = email.trim().toLowerCase();
    const user = dbState.users.find((u) => u.email.toLowerCase() === emailNorm);
    if (!user) {
      throw new Error("Nenhuma conta encontrada com este e-mail.");
    }

    // 6-digit code and secure reset token
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(24).toString("hex");
    const expires_at = Date.now() + 30 * 60 * 1000; // 30 minutes

    // Remove older codes for this email
    dbState.reset_codes = dbState.reset_codes.filter((r) => r.email.toLowerCase() !== emailNorm);
    dbState.reset_codes.push({ email: emailNorm, code, token, expires_at } as any);
    saveDatabase();

    console.log(`[PASSWORD RESET] Solicitação de recuperação para ${emailNorm}`);

    // Disparar envio de e-mail ao usuário com o código se SMTP estiver configurado
    const now = new Date();
    const dataHoraFormatada = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const emailSubject = `[CalcPro] Código para Redefinição de Senha: ${code}`;
    const emailBody = `
Olá, ${user.nome}!

Você solicitou a redefinição de senha para sua conta no CalcPro.

Seu código de verificação é: ${code}

Este código tem validade de 30 minutos.
Insira este código na tela de recuperação do aplicativo junto com sua nova senha.

Caso você não tenha solicitado esta recuperação, ignore esta mensagem. Sua conta permanece segura.

Data da solicitação: ${dataHoraFormatada}
---
Equipe CalcPro - Engenharia e Gestão CEMIG
`.trim();

    // Envio seguro via SMTP se configurado
    const emailResult = await sendEmailSafely(user.email, emailSubject, emailBody);
    const emailSent = emailResult.success;

    // Se o solicitante não for o admin, notificar o admin também
    if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      await sendEmailSafely(
        ADMIN_EMAIL,
        `[CalcPro] Solicitação de Recuperação de Senha - ${user.nome}`,
        `O usuário ${user.nome} (${user.email}) solicitou código de recuperação de senha em ${dataHoraFormatada}.\nCódigo gerado: ${code}`
      );
    }

    // Registrar no histórico de notificações do banco de dados (visível para o Admin no painel)
    dbState.email_notifications.unshift({
      id: `reset_${Date.now()}`,
      recipient: user.email,
      subject: emailSubject,
      body: `Solicitação de redefinição de senha para ${user.nome} (${user.email}). ${emailSent ? "Notificação enviada por e-mail." : "Autorizada recuperação direta pelo sistema."}`,
      timestamp: now.toISOString(),
      status: emailSent ? "enviado_smtp" : "registrado_servidor",
    });
    saveDatabase();

    return { code, token, emailSent };
  },

  // Direct reset password by Administrator (via Admin Panel)
  adminResetUserPassword: async (userId: string, newPassword: string): Promise<boolean> => {
    loadDatabase();
    const user = dbState.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error("A senha deve conter no mínimo 6 caracteres.");
    }
    user.senha_hash = hashPassword(newPassword);
    saveDatabase();
    return true;
  },

  // Reset Password using recovery code or validated token
  resetPassword: async (params: {
    email: string;
    code?: string;
    token?: string;
    newPassword: string;
  }): Promise<boolean> => {
    loadDatabase();
    const emailNorm = params.email.trim().toLowerCase();
    const user = dbState.users.find((u) => u.email.toLowerCase() === emailNorm);
    if (!user) {
      throw new Error("Conta não encontrada.");
    }
    if (!params.newPassword || params.newPassword.length < 6) {
      throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
    }

    let isValid = false;
    if (params.token) {
      const resetEntry = dbState.reset_codes.find(
        (r) =>
          r.email.toLowerCase() === emailNorm &&
          (r as any).token === params.token &&
          r.expires_at > Date.now()
      );
      if (resetEntry) isValid = true;
    } else if (params.code) {
      const resetEntry = dbState.reset_codes.find(
        (r) =>
          r.email.toLowerCase() === emailNorm &&
          r.code === params.code?.trim() &&
          r.expires_at > Date.now()
      );
      if (resetEntry) isValid = true;
    }

    if (!isValid) {
      throw new Error("Autorização de recuperação inválida ou expirada. Solicite novamente.");
    }

    user.senha_hash = hashPassword(params.newPassword);
    dbState.reset_codes = dbState.reset_codes.filter((r) => r.email.toLowerCase() !== emailNorm);
    saveDatabase();

    return true;
  },

  // Save calculation
  saveCalculo: async (params: {
    userId: string;
    dadosJson: any;
    cargaTermica?: string | number;
    metodo?: string;
  }): Promise<CalculoRecord> => {
    loadDatabase();
    const now = new Date();
    const user = dbState.users.find((u) => u.id === params.userId);

    const record: CalculoRecord = {
      id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: params.userId,
      user_email: user?.email,
      dados_json: params.dadosJson,
      carga_termica: params.cargaTermica || 0,
      metodo: params.metodo || "Explosão Automática CEMIG",
      data: now.toISOString(),
    };

    dbState.calculos.unshift(record);
    if (dbState.calculos.length > 500) {
      dbState.calculos = dbState.calculos.slice(0, 500);
    }
    saveDatabase();
    return record;
  },

  // Get user calculations
  getCalculos: (userId?: string): CalculoRecord[] => {
    loadDatabase();
    if (userId) {
      return dbState.calculos.filter((c) => c.user_id === userId);
    }
    return dbState.calculos;
  },

  // Admin: Get all users with login stats
  getAllUsers: (): (Omit<User, "senha_hash"> & { loginCount: number; trialInfo: UserTrialInfo })[] => {
    loadDatabase();
    return dbState.users.map((u) => {
      const logins = dbState.logins.filter((l) => l.user_id === u.id);
      const trialInfo = evaluateUserTrial(u, u.device_serial);
      const { senha_hash, ...rest } = u;
      return {
        ...rest,
        loginCount: logins.length,
        trialInfo,
      };
    });
  },

  // Admin: Update user status (Liberar, Bloquear, Trial)
  updateUserStatus: (
    userId: string,
    newStatus: UserStatus,
    extendDays?: number
  ): User => {
    loadDatabase();
    const user = dbState.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    user.status = newStatus;

    // Para o administrador patricioaug@gmail.com, o status é SEMPRE "liberado" e nunca há prazo de trial
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      user.status = "liberado";
      user.trial_inicio = "";
      user.trial_fim = "";
      saveDatabase();
      return user;
    }

    if (extendDays && extendDays > 0) {
      const now = new Date();
      user.trial_inicio = now.toISOString();
      user.trial_fim = new Date(now.getTime() + extendDays * 24 * 60 * 60 * 1000).toISOString();
      if (user.device_serial) {
        const dev = dbState.device_trials.find((d) => d.device_serial === user.device_serial);
        if (dev) {
          dev.first_trial_fim = user.trial_fim;
        }
      }
    }
    saveDatabase();
    return user;
  },

  // Admin: Get all login history
  getLoginHistory: (): LoginRecord[] => {
    loadDatabase();
    return dbState.logins;
  },

  // Admin: Get email notifications
  getEmailNotifications: (): EmailNotificationLog[] => {
    loadDatabase();
    return dbState.email_notifications;
  },

  // Find user by ID
  getUserById: (userId: string): User | undefined => {
    loadDatabase();
    return dbState.users.find((u) => u.id === userId);
  },

  // Find user by Email
  getUserByEmail: (email?: string): User | undefined => {
    if (!email) return undefined;
    loadDatabase();
    const emailNorm = String(email).trim().toLowerCase();
    return dbState.users.find((u) => u.email.toLowerCase() === emailNorm);
  },
};
