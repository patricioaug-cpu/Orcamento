import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  processOfficialMnemonics,
  getAllOfficialMnemonics,
  getMnemonicCatalogStats,
} from "./server/mnemonicService";
import {
  consultarItemPorDescricao,
  getAllCatalogRecords,
  getCatalogStats,
  executarValidacaoCatalogo,
} from "./server/itemCatalogService";
import {
  getSimbologiaOficial,
  getSimbologiaCategorias,
  getSimbologiaPorCategoria,
  getSimbologiaStats,
} from "./server/simbologiaService";
import {
  getAllAssociacoes,
  getAssociacaoPorSimboloId,
  getAssociacoesPorMnemonico,
  getAssociacoesStats,
} from "./server/simbologiaMnemonicService";
import {
  executarMotorReconhecimento,
  ElementoDetectadoInput,
  RelatorioReconhecimentoProjeto,
} from "./server/recognitionEngineService";
import {
  reconhecerSimbologiaProjeto,
  getAllOfficialSymbols,
  getOfficialSymbolById,
  ProjectSymbolCandidateInput,
} from "./server/projectSymbolRecognitionService";
import {
  processarProjetoComSimbologiaOficial,
  ProjetoProcessadoOficial,
} from "./server/orchestrationService";
import {
  analysisCache,
  buildOptimizedSystemPrompt,
} from "./server/tokenOptimizationService";
import {
  UserService,
  ADMIN_EMAIL,
  evaluateUserTrial,
} from "./server/userService";

dotenv.config();

const app = express();
const PORT = 3000;

// Add CORS headers middleware for iframe and development preview compatibility
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Robust body parsing compatible with both Vercel Serverless Functions and standalone Express
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    return next();
  }
  express.json({ limit: "50mb" })(req, res, next);
});

app.use((req, res, next) => {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    return next();
  }
  express.urlencoded({ extended: true, limit: "50mb" })(req, res, next);
});

// Express JSON parsing error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === "entity.too.large" || err.status === 413)) {
    return res.status(413).json({
      success: false,
      error: "O arquivo enviado é muito grande para o processamento direto (HTTP 413). Tente reduzir a resolução ou compactar o arquivo.",
    });
  }
  if (err) {
    console.error("Express middleware error:", err);
    return res.status(400).json({ success: false, error: "Formato de requisição inválido." });
  }
  next();
});


// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Splash Screen & Asset image route
app.get(["/splash_screen.png", "/file_000000000bf4820e964dd2c8ded3136c.png"], (req, res) => {
  const imgPath = path.join(process.cwd(), "public", "splash_screen.png");
  if (fs.existsSync(imgPath)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(imgPath);
  }
  res.status(404).send("Image not found");
});

// ==================== AUTH & TRIAL & ADMIN ROUTES ====================

// Register
app.post(["/api/auth/register", "/auth/register"], async (req, res) => {
  try {
    const { nome, email, password, deviceSerial } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const result = await UserService.registerUser({
      nome,
      email,
      password,
      deviceSerial,
      ip: String(Array.isArray(ip) ? ip[0] : ip),
    });
    const { senha_hash, ...safeUser } = result.user;
    res.json({ success: true, user: safeUser, trialInfo: result.trialInfo });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  try {
    const { email, password, deviceSerial } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const result = await UserService.loginUser({
      email,
      password,
      deviceSerial,
      ip: String(Array.isArray(ip) ? ip[0] : ip),
    });
    const { senha_hash, ...safeUser } = result.user;
    res.json({ success: true, user: safeUser, trialInfo: result.trialInfo });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Forgot password
app.post(["/api/auth/forgot-password", "/auth/forgot-password"], async (req, res) => {
  try {
    const { email } = req.body;
    const result = await UserService.generatePasswordResetCode(email);
    res.json({
      success: true,
      emailSent: result.emailSent,
      directReset: !result.emailSent,
      token: !result.emailSent ? result.token : undefined,
      message: result.emailSent
        ? "Código de verificação enviado para seu e-mail cadastrado. Verifique sua caixa de entrada e pasta de spam."
        : "Conta localizada com sucesso. Digite sua nova senha abaixo para redefinir o acesso.",
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reset password
app.post(["/api/auth/reset-password", "/auth/reset-password"], async (req, res) => {
  try {
    const { email, code, token, newPassword } = req.body;
    await UserService.resetPassword({ email, code, token, newPassword });
    res.json({ success: true, message: "Senha redefinida com sucesso. Faça login com sua nova senha." });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin direct reset user password
app.post(["/api/admin/users/reset-password", "/admin/users/reset-password"], async (req, res) => {
  try {
    const { adminEmail, userId, newPassword } = req.body;
    if (String(adminEmail || "").trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Apenas o administrador mestre pode redefinir senhas." });
    }
    await UserService.adminResetUserPassword(userId, newPassword);
    res.json({ success: true, message: "Senha do usuário atualizada com sucesso pelo administrador." });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Check Trial status
app.post(["/api/auth/check-trial", "/auth/check-trial"], (req, res) => {
  try {
    const { userId, userEmail, deviceSerial } = req.body;

    // Se for o administrador patricioaug@gmail.com, acesso é imediatamente liberado sem contabilizar trial
    if (String(userEmail || "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return res.json({
        success: true,
        trialInfo: {
          status: "liberado",
          isAdmin: true,
          isExpired: false,
          daysRemaining: -1,
          trialInicio: "",
          trialFim: "",
          deviceBound: false,
          message: "Acesso permanente de Administrador: sempre liberado, sem tempo de trial.",
        },
      });
    }

    const user = userId ? UserService.getUserById(userId) : UserService.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado." });
    }
    const trialInfo = evaluateUserTrial(user, deviceSerial);
    res.json({ success: true, trialInfo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Middleware check: strictly patricioaug@gmail.com
function checkAdminAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminEmailHeader =
    req.headers["x-user-email"] ||
    req.headers["x-admin-email"] ||
    req.query.adminEmail ||
    req.body.adminEmail;
  if (String(adminEmailHeader).trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ success: false, error: "Acesso restrito ao Administrador do sistema (patricioaug@gmail.com)." });
  }
  next();
}

// Admin: Get all users
app.get(["/api/admin/users", "/admin/users"], checkAdminAccess, (req, res) => {
  try {
    const users = UserService.getAllUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Update user status / manual release
app.post(["/api/admin/users/status", "/admin/users/status"], checkAdminAccess, (req, res) => {
  try {
    const { targetUserId, status, extendDays } = req.body;
    const user = UserService.updateUserStatus(targetUserId, status, extendDays);
    const { senha_hash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Get logins history
app.get(["/api/admin/logins", "/admin/logins"], checkAdminAccess, (req, res) => {
  try {
    const logins = UserService.getLoginHistory();
    res.json({ success: true, logins });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Get email notifications
app.get(["/api/admin/notifications", "/admin/notifications"], checkAdminAccess, (req, res) => {
  try {
    const notifications = UserService.getEmailNotifications();
    res.json({ success: true, notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save calculation
app.post(["/api/calculos/save", "/calculos/save"], async (req, res) => {
  try {
    const { userId, dadosJson, cargaTermica, metodo } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId obrigatório." });
    }
    const record = await UserService.saveCalculo({
      userId,
      dadosJson,
      cargaTermica,
      metodo,
    });
    res.json({ success: true, record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get calculations
app.get(["/api/calculos", "/calculos"], (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    const calculos = UserService.getCalculos(userId || undefined);
    res.json({ success: true, calculos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Route for Official Item Catalog Lookup
app.get("/api/catalog/items/all", (req, res) => {
  try {
    const records = getAllCatalogRecords();
    res.json({
      success: true,
      total: records.length,
      records,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(["/api/catalog/items", "/api/catalog/items/all"], (req, res) => {
  try {
    const records = getAllCatalogRecords();
    res.json({
      success: true,
      total: records.length,
      records,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/catalog/items/lookup", (req, res) => {
  const descricao = String(req.query.descricao || req.query.desc || "");
  const result = consultarItemPorDescricao(descricao);
  res.json(result);
});

app.post("/api/catalog/items/lookup", (req, res) => {
  const { descricao, descricoes } = req.body;
  if (Array.isArray(descricoes)) {
    const results = descricoes.map((d) => ({
      descricao: d,
      ...consultarItemPorDescricao(String(d || "")),
    }));
    return res.json({ total: results.length, items: results });
  }
  const result = consultarItemPorDescricao(String(descricao || ""));
  res.json(result);
});

// API Route for Catalog Statistics
app.get("/api/catalog/items/stats", (req, res) => {
  try {
    const stats = getCatalogStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API Route for Catalog Validation Suite
app.get("/api/catalog/items/validate", (req, res) => {
  try {
    const validacao = executarValidacaoCatalogo();
    res.json({ success: true, validacao });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes for Official Mnemonic Catalog
app.get("/api/catalog/mnemonics/all", (req, res) => {
  try {
    const mnemonicos = getAllOfficialMnemonics();
    res.json({
      success: true,
      total: mnemonicos.length,
      mnemonicos,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/catalog/mnemonics/stats", (req, res) => {
  try {
    const stats = getMnemonicCatalogStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes for Exploding and Consolidating Mnemonics into Materials
app.post(["/api/explode-mnemonics", "/api/catalog/mnemonics/explode"], (req, res) => {
  try {
    const rawData = req.body;
    const result = processOfficialMnemonics(rawData);
    res.json({
      success: true,
      result,
      groupedMnemonics: result.groupedMnemonics,
      materials: result.materials,
      structureItemMap: result.structureItemMap,
      mnemonicosNaoEncontrados: result.mnemonicosNaoEncontrados,
      catalogStats: result.catalogStats,
    });
  } catch (err: any) {
    console.error("Erro na explosão de mnemônicos:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes for IT-EO-008 Official Symbology Base
app.get("/api/simbologia/all", (req, res) => {
  try {
    const base = getSimbologiaOficial();
    res.json({ success: true, base });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/simbologia/categories", (req, res) => {
  try {
    const categories = getSimbologiaCategorias();
    res.json({ success: true, total: categories.length, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/simbologia/category/:name", (req, res) => {
  try {
    const category = getSimbologiaPorCategoria(req.params.name);
    if (!category) {
      return res.status(404).json({ success: false, error: `Categoria '${req.params.name}' não reconhecida na IT-EO-008.` });
    }
    res.json({ success: true, categoryName: req.params.name, data: category });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/simbologia/stats", (req, res) => {
  try {
    const stats = getSimbologiaStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes for Controlled Symbology -> Mnemonic Association (ETAPA 2)
app.get("/api/simbologia-mnemonicos", (req, res) => {
  try {
    const associacoes = getAllAssociacoes();
    res.json({ success: true, total: associacoes.length, associacoes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/simbologia-mnemonicos/stats", (req, res) => {
  try {
    const stats = getAssociacoesStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/simbologia-mnemonicos/mnemonico/:codigo", (req, res) => {
  try {
    const associacoes = getAssociacoesPorMnemonico(req.params.codigo);
    res.json({ success: true, mnemonico: req.params.codigo, total: associacoes.length, associacoes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/simbologia-mnemonicos/:simboloId", (req, res) => {
  try {
    const associacao = getAssociacaoPorSimboloId(req.params.simboloId);
    if (!associacao) {
      return res.status(404).json({ success: false, error: `Símbolo '${req.params.simboloId}' não encontrado na base de associações.` });
    }
    res.json({ success: true, associacao });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// API Routes for Recognition & Mapping Engine (ETAPA 3)
// ============================================================
app.post("/api/recognition-engine/process", (req, res) => {
  try {
    const { elementos, arquivoOrigem } = req.body;
    if (!Array.isArray(elementos)) {
      return res.status(400).json({
        success: false,
        error: "O campo 'elementos' deve ser um array de elementos detectados.",
      });
    }

    const relatorio = executarMotorReconhecimento(elementos, arquivoOrigem);
    res.json({ success: true, relatorio });
  } catch (err: any) {
    console.error("Erro no motor de reconhecimento:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// API Routes for Official Symbol Recognition in Projects (ETAPA 5 & 6)
// ============================================================
app.post("/api/project-symbols/recognize", (req, res) => {
  try {
    const { candidatos, arquivoOrigem } = req.body;
    if (!Array.isArray(candidatos)) {
      return res.status(400).json({
        success: false,
        error: "O campo 'candidatos' deve ser um array de candidatos detectados no projeto.",
      });
    }

    const relatorio = reconhecerSimbologiaProjeto(candidatos, arquivoOrigem);
    res.json({ success: true, relatorio });
  } catch (err: any) {
    console.error("Erro no reconhecimento de símbolos em projetos:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/project-symbols/official-list", (req, res) => {
  try {
    const symbols = getAllOfficialSymbols();
    res.json({ success: true, total: symbols.length, symbols });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// API Routes for Integrated Orchestration Flow (ETAPA 4 & 6)
// Fluxo: Projeto -> Simbologia Oficial -> Mnemônico -> Materiais
// ============================================================
app.post("/api/orchestration/process-project", (req, res) => {
  try {
    const { elementos, arquivoOrigem } = req.body;
    if (!Array.isArray(elementos)) {
      return res.status(400).json({
        success: false,
        error: "O campo 'elementos' deve ser um array de elementos detectados do projeto.",
      });
    }

    const resultado = processarProjetoComSimbologiaOficial(elementos, arquivoOrigem);
    res.json({ success: true, resultado });
  } catch (err: any) {
    console.error("Erro na orquestração oficial da Etapa 4:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Extrator e reparador tolerante a falhas de JSON retornado por modelos de visão.
 * Lida com markdown em blocos, vírgulas residuais, comentários, strings truncadas,
 * objetos aninhados e formatos fora do padrão estrito.
 */
function extractAndRepairProjectJson(rawText: string): any {
  if (!rawText || typeof rawText !== "string") {
    return {
      detectedStructures: [],
      detectedPoles: [],
      detectedTransformers: [],
      detectedGuys: [],
      detectedCables: [],
      unrecognizedItems: [],
      generalSummary: "Nenhum elemento identificado na resposta do modelo.",
    };
  }

  // 1. Remove cercas de markdown e espaços
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // 2. Tentativa direta
  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === "object") return direct;
  } catch {}

  // 3. Extrai o bloco mais amplo entre { e } ou [ e ]
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  let candidate = cleaned;
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidate = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      candidate = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  // 4. Limpeza de comentários JS e vírgulas residuais antes de fechamentos
  let sanitized = candidate
    .replace(/\/\/[^\n\r]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([\}\]])/g, "$1");

  try {
    const parsed = JSON.parse(sanitized);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}

  // 5. Reparo de JSON truncado (caso o modelo atinja o limite de tokens antes de fechar colchetes)
  let repaired = sanitized;
  let inString = false;
  let escape = false;
  const openStack: string[] = [];

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        openStack.push(char);
      } else if (char === "}" || char === "]") {
        const last = openStack[openStack.length - 1];
        if ((char === "}" && last === "{") || (char === "]" && last === "[")) {
          openStack.pop();
        }
      }
    }
  }

  if (inString) {
    repaired += '"';
  }

  // Remove vírgula final pendente
  repaired = repaired.replace(/,\s*$/, "");

  // Fecha pilhas abertas
  while (openStack.length > 0) {
    const open = openStack.pop();
    if (open === "{") repaired += "}";
    if (open === "[") repaired += "]";
  }

  repaired = repaired.replace(/,\s*([\}\]])/g, "$1");

  try {
    const parsed = JSON.parse(repaired);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}

  // 6. Recuperação heurística por Regex: extrai qualquer poste, estrutura, transformador etc.
  const recovered: any = {
    detectedStructures: [],
    detectedPoles: [],
    detectedTransformers: [],
    detectedGuys: [],
    detectedCables: [],
    unrecognizedItems: [],
    generalSummary: "Extração resiliente por reconhecimento estrutural.",
  };

  const structMatches = cleaned.matchAll(/\{[^{}]*"(?:code|id)"\s*:\s*"([^"]+)"[^{}]*\}/gi);
  for (const match of structMatches) {
    try {
      const item = JSON.parse(match[0].replace(/,\s*([\}\]])/g, "$1"));
      if (item.code) {
        recovered.detectedStructures.push(item);
      } else if (item.typeSpec || item.shape) {
        recovered.detectedPoles.push(item);
      } else if (item.powerKva) {
        recovered.detectedTransformers.push(item);
      } else if (item.cableType) {
        recovered.detectedCables.push(item);
      }
    } catch {}
  }

  return recovered;
}

// Initialize Gemini client server-side lazily or safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Route for Analyzing CEMIG Project Drawings
app.all(["/api/analyze-project", "/analyze-project"], async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Utilize POST para análise de projetos." });
  }

  try {
    const { imageBase64, mimeType, fileName, voltageLevel, userId, userEmail, deviceSerial } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "Nenhuma imagem ou arquivo PDF fornecido." });
    }

    // Trial / User Status verification
    if (userId || userEmail) {
      const isEmailAdmin = String(userEmail || "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const user = userId ? UserService.getUserById(userId) : UserService.getUserByEmail(userEmail);
      const isUserAdmin = isEmailAdmin || (user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      // O administrador patricioaug@gmail.com tem acesso sempre liberado e o tempo de trial não é contabilizado
      if (!isUserAdmin && user) {
        const trialInfo = evaluateUserTrial(user, deviceSerial);
        if (trialInfo.isExpired) {
          return res.status(403).json({
            success: false,
            trialExpired: true,
            error: "Seu período de avaliação terminou. Entre em contato pelo e mail patricioaug@gmail.com para continuar.",
          });
        }
      }
    }

    const voltageLabel = voltageLevel === "34.5kV"
      ? "34,5 kV (MT Rural / Subtransmissão - Classe 35 kV)"
      : voltageLevel === "7.97kV"
      ? "7,97 kV (Monofásico MT / MRT - Classe 15 kV)"
      : voltageLevel === "19.9kV"
      ? "19,9 kV (Monofásico MRT 34,5 kV - Classe 35 kV)"
      : voltageLevel === "BT"
      ? "Baixa Tensão (BT 380/220V / 220/127V)"
      : voltageLevel === "AUTO"
      ? "Automático / Misto (Detectar do Projeto)"
      : "13,8 kV (Padrão MT CEMIG Urbano/Rural - Classe 15 kV)";

    const fileHash = analysisCache.computeHash(imageBase64, voltageLevel || "AUTO");
    const cachedResult = analysisCache.get(fileHash);

    if (cachedResult) {
      console.log(`[Cache Hit] Resultado recuperado do cache SHA-256 para o projeto (${fileHash.slice(0, 10)}...). Economia de 100% de tokens de IA.`);
      return res.json({
        success: true,
        data: cachedResult.data,
        recognitionAudit: cachedResult.recognitionAudit,
        orchestration: cachedResult.orchestration,
        source: "cache",
        catalog: cachedResult.catalog,
        cacheHit: true,
        hash: fileHash,
      });
    }

    const systemPrompt = buildOptimizedSystemPrompt(voltageLabel, voltageLevel);

    const ai = getGeminiClient();

    if (ai) {
      // Fast multi-model cascade: Try each model once without excessive backoff delay
      // to guarantee the response completes well before the cloud gateway timeout (60s).
      // Fast multi-model cascade: Prioritizes active, highly available vision models
      // 1. gemini-3.8-flash: State-of-the-art multimodal vision model for electrical diagrams
      // 2. gemini-3.1-flash-lite: Ultra-fast low-latency contingency model
      // 3. gemini-flash-latest: Stable fallback model
      const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ];

      let lastError: any = null;
      let responseText = "{}";
      const startTime = Date.now();
      const MAX_TOTAL_TIME_MS = 48000; // 48 seconds safety cutoff for serverless environments

      for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
        // If we have already spent more than 45 seconds, abort early to return a clean 503 response
        if (Date.now() - startTime > MAX_TOTAL_TIME_MS) {
          console.warn("[Gemini API] Tempo limite de segurança de 48s atingido. Retornando 503 limpo.");
          break;
        }

        const modelName = modelsToTry[mIdx];
        let succeeded = false;

        try {
          console.log(`[Gemini API] Solicitando análise com modelo ${modelName}...`);
          
          // Guarantee that an individual model call never hangs indefinitely
          const MODEL_TIMEOUT_MS = 24000;
          let timeoutTimer: NodeJS.Timeout | null = null;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutTimer = setTimeout(() => {
              reject(new Error(`Tempo limite de ${MODEL_TIMEOUT_MS / 1000}s excedido no modelo ${modelName}`));
            }, MODEL_TIMEOUT_MS);
          });

          const modelCallPromise = ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: imageBase64,
                  },
                },
                {
                  text: `Faça uma varredura COMPLETA, EXAUSTIVA e RIGOROSA neste projeto elétrico CEMIG (Nível de Tensão: ${voltageLabel}).
DIRETRIZES DE EXTRAÇÃO SEM PERDAS:
1. Mapeie 100% dos postes numerados (P1 a PN) sem interromper a lista e sem omitir nenhum poste.
2. Extraia todas as estruturas MT e BT de cada poste (ex: N1, N2, N3, CE1, CE3, M1, etc.). Se um poste possuir MT e BT ou mais de uma estrutura, registre cada uma individualmente.
3. Extraia todos os equipamentos e chaves (Chaves Fusíveis CFS, Chaves Faca CFC, Pára-raios PR, religadores) no campo "detectedEquipment" associando ao respectivo poste.
4. Extraia todos os transformadores (kVA, tensão e poste), estais e vãos de condutores com metragens.
5. Inspecione tanto a rede gráfica quanto quadros de cargas, tabelas de estruturas ou listas na prancha.
6. Registre com status 'RETIRAR' qualquer elemento com sinalização de desmonte, tachado ou marcado com 'X'. Itens novos como 'INSTALAR'.`,
                },
              ],
            },
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              maxOutputTokens: 16384,
            },
          });

          const response = await Promise.race([modelCallPromise, timeoutPromise]);
          if (timeoutTimer) clearTimeout(timeoutTimer);

          if (response && response.text) {
            responseText = response.text;
            succeeded = true;
            console.log(`[Gemini API] Análise concluída com sucesso via modelo ${modelName}.`);
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          const errMsg = String(modelErr?.message || "").toLowerCase();
          const errStatus = modelErr?.status || modelErr?.code || (modelErr?.error && modelErr.error.code);
          console.log(
            `[Gemini API] Modelo ${modelName} retornou estado (${errStatus || "erro"}). Mensagem: ${errMsg.slice(0, 100)}`
          );

          // Fast fallback to next model immediately without blocking the connection
          if (mIdx < modelsToTry.length - 1) {
            console.log(`[Gemini API] Alternando imediatamente para o modelo de contingência (${modelsToTry[mIdx + 1]})...`);
          }
        }

        if (succeeded) {
          lastError = null;
          break;
        }
      }

      if (lastError) {
        throw lastError;
      }

      try {
        let parsedData = extractAndRepairProjectJson(responseText);

        // Se o resultado estiver encapsulado em projeto/data ou for array direto, normaliza
        if (Array.isArray(parsedData)) {
          const list = parsedData;
          parsedData = {
            detectedStructures: list.filter((i: any) => i && (i.code || i.voltage || String(i.tipo || "").includes("ESTRUTURA"))),
            detectedPoles: list.filter((i: any) => i && (i.typeSpec || i.shape || String(i.tipo || "").includes("POSTE"))),
            detectedTransformers: list.filter((i: any) => i && (i.powerKva || String(i.tipo || "").includes("TRANSF"))),
            detectedGuys: list.filter((i: any) => i && (String(i.type || "").includes("ANCORA") || String(i.tipo || "").includes("ESTAI"))),
            detectedCables: list.filter((i: any) => i && (i.cableType || String(i.tipo || "").includes("CABO"))),
          };
        } else if (parsedData && typeof parsedData === "object") {
          if (parsedData.projeto && typeof parsedData.projeto === "object") {
            parsedData = { ...parsedData.projeto, ...parsedData };
          } else if (parsedData.data && typeof parsedData.data === "object") {
            parsedData = { ...parsedData.data, ...parsedData };
          }
        }

        if (!parsedData || typeof parsedData !== "object") {
          parsedData = {};
        }

        // Garante arrays seguros para evitar qualquer TypeError posterior
        parsedData.detectedPoles = Array.isArray(parsedData.detectedPoles) ? parsedData.detectedPoles : [];
        parsedData.detectedStructures = Array.isArray(parsedData.detectedStructures) ? parsedData.detectedStructures : [];
        parsedData.detectedEquipment = Array.isArray(parsedData.detectedEquipment)
          ? parsedData.detectedEquipment
          : Array.isArray(parsedData.detectedEquipments)
          ? parsedData.detectedEquipments
          : Array.isArray(parsedData.detectedSwitches)
          ? parsedData.detectedSwitches
          : Array.isArray(parsedData.chaves)
          ? parsedData.chaves
          : [];
        parsedData.detectedTransformers = Array.isArray(parsedData.detectedTransformers)
          ? parsedData.detectedTransformers
          : Array.isArray(parsedData.trafos)
          ? parsedData.trafos
          : [];
        parsedData.detectedGuys = Array.isArray(parsedData.detectedGuys)
          ? parsedData.detectedGuys
          : Array.isArray(parsedData.estais)
          ? parsedData.estais
          : [];
        parsedData.detectedCables = Array.isArray(parsedData.detectedCables)
          ? parsedData.detectedCables
          : Array.isArray(parsedData.cabos)
          ? parsedData.cabos
          : [];
        parsedData.detectedGrounding = Array.isArray(parsedData.detectedGrounding)
          ? parsedData.detectedGrounding
          : Array.isArray(parsedData.aterramentos)
          ? parsedData.aterramentos
          : [];

        // Extrai estruturas ou equipamentos aninhados dentro de postes para evitar perda de dados
        parsedData.detectedPoles.forEach((p: any, idx: number) => {
          const poleId = p.id || `P${idx + 1}`;
          // Estruturas aninhadas no poste
          const nestedStructs = Array.isArray(p.structures) ? p.structures : Array.isArray(p.estruturas) ? p.estruturas : [];
          nestedStructs.forEach((st: any) => {
            const stCode = typeof st === "string" ? st : st.code || st.codigo;
            if (stCode) {
              const alreadyExists = parsedData.detectedStructures.some(
                (existing: any) => (existing.id === poleId || existing.associatedPost === poleId) && existing.code === stCode
              );
              if (!alreadyExists) {
                parsedData.detectedStructures.push({
                  id: poleId,
                  code: stCode,
                  associatedPost: p.typeSpec || poleId,
                  voltage: stCode.startsWith("CE") ? "BT" : "MT",
                  status: p.status || "INSTALAR",
                  description: `Estrutura ${stCode} no Poste ${poleId}`,
                });
              }
            }
          });
          // Equipamentos aninhados no poste (chaves, para-raios)
          const nestedEquip = Array.isArray(p.equipment) ? p.equipment : Array.isArray(p.equipamentos) ? p.equipamentos : Array.isArray(p.chaves) ? p.chaves : [];
          nestedEquip.forEach((eq: any) => {
            const eqCode = typeof eq === "string" ? eq : eq.code || eq.specification || eq.type;
            if (eqCode) {
              const alreadyExists = parsedData.detectedEquipment.some(
                (existing: any) => existing.associatedPole === poleId && (existing.code === eqCode || existing.specification === eqCode)
              );
              if (!alreadyExists) {
                parsedData.detectedEquipment.push({
                  id: `EQ_${poleId}`,
                  code: eqCode,
                  specification: eqCode,
                  associatedPole: poleId,
                  status: p.status || "INSTALAR",
                  description: `Equipamento ${eqCode} no Poste ${poleId}`,
                });
              }
            }
          });
        });

        // Prepara lista de elementos detectados para o motor oficial de reconhecimento
        const elementosParaReconhecimento: ElementoDetectadoInput[] = [];

        if (Array.isArray(parsedData.detectedPoles)) {
          parsedData.detectedPoles.forEach((p: any, idx: number) => {
            elementosParaReconhecimento.push({
              id: p.id || `P${idx + 1}`,
              tipo: "POSTE",
              especificacao: p.typeSpec || p.associatedPost,
              formato: p.shape,
              material: p.material,
              mnemonicCode: p.mnemonicCode,
              tensao: voltageLevel || "13.8kV",
              status: p.status,
              descricao: `Poste ${p.id || idx + 1} (${p.typeSpec || ""})`,
              pagina: Number(p.pageNumber || p.pagina || 1),
            });
          });
        }

        if (Array.isArray(parsedData.detectedStructures)) {
          parsedData.detectedStructures.forEach((s: any, idx: number) => {
            elementosParaReconhecimento.push({
              id: s.id || `ESTR_${idx + 1}`,
              tipo: s.voltage === "BT" ? "ESTRUTURA BT" : "ESTRUTURA MT",
              codigo: s.code,
              mnemonicCode: s.mnemonicCode,
              tensao: s.voltage === "BT" ? "BT" : (voltageLevel || "13.8kV"),
              status: s.status,
              descricao: s.description || `Estrutura ${s.code || ""}`,
              especificacao: s.associatedPost,
              localizacao: s.associatedPost ? `Poste ${s.associatedPost}` : (s.id ? `Poste ${s.id}` : undefined),
              pagina: Number(s.pageNumber || s.pagina || 1),
            });
          });
        }

        if (Array.isArray(parsedData.detectedEquipment)) {
          parsedData.detectedEquipment.forEach((eq: any, idx: number) => {
            elementosParaReconhecimento.push({
              id: eq.id || `EQ_${eq.associatedPole || idx + 1}`,
              tipo: eq.type || "EQUIPAMENTO",
              codigo: eq.code || eq.specification || eq.type,
              mnemonicCode: eq.mnemonicCode,
              tensao: eq.voltage || voltageLevel || "13.8kV",
              status: eq.status,
              especificacao: eq.specification,
              descricao: eq.description || `${eq.type || "Equipamento"} ${eq.code || ""} ${eq.specification || ""}`.trim(),
              localizacao: eq.associatedPole ? `Poste ${eq.associatedPole}` : undefined,
              quantidade: Number(eq.quantity) || 1,
              pagina: Number(eq.pageNumber || eq.pagina || 1),
            });
          });
        }

        if (Array.isArray(parsedData.detectedTransformers)) {
          parsedData.detectedTransformers.forEach((t: any, idx: number) => {
            elementosParaReconhecimento.push({
              id: t.associatedPole ? `TR_${t.associatedPole}` : `TR_${idx + 1}`,
              tipo: "TRANSFORMADOR",
              mnemonicCode: t.mnemonicCode,
              tensao: t.voltage || voltageLevel || "13.8kV",
              especificacao: `${t.powerKva || ""}KVA ${t.voltage || ""}`,
              status: t.status,
              descricao: `Transformador ${t.powerKva || ""}kVA`,
              localizacao: t.associatedPole ? `Poste ${t.associatedPole}` : undefined,
              pagina: Number(t.pageNumber || t.pagina || 1),
            });
          });
        }

        if (Array.isArray(parsedData.detectedGuys)) {
          parsedData.detectedGuys.forEach((g: any, idx: number) => {
            elementosParaReconhecimento.push({
              id: `ESTAI_${idx + 1}`,
              tipo: "ESTAI",
              mnemonicCode: g.mnemonicCode,
              tensao: voltageLevel || "13.8kV",
              status: g.status,
              descricao: `Estai de ${g.type || "Âncora"}`,
              localizacao: g.associatedPole ? `Poste ${g.associatedPole}` : undefined,
              quantidade: g.quantity || 1,
              pagina: Number(g.pageNumber || g.pagina || 1),
            });
          });
        }

        if (Array.isArray(parsedData.detectedGrounding)) {
          parsedData.detectedGrounding.forEach((gr: any, idx: number) => {
            elementosParaReconhecimento.push({
              id: gr.id || `AT_${idx + 1}`,
              tipo: "ATERRAMENTO",
              codigo: gr.code || "ATERRAMENTO",
              mnemonicCode: gr.mnemonicCode,
              tensao: voltageLevel || "13.8kV",
              status: gr.status,
              descricao: gr.description || `Aterramento ${gr.type || "com haste"}`,
              localizacao: gr.associatedPole ? `Poste ${gr.associatedPole}` : undefined,
              pagina: Number(gr.pageNumber || gr.pagina || 1),
            });
          });
        }

        if (Array.isArray(parsedData.detectedCables) && parsedData.detectedCables.length > 0) {
          // Contabilização e agrupamento dos cabos da rede, somando os vãos separados de acordo com as especificações do projeto
          const cableGroupMap = new Map<string, {
            id: string;
            cableType: string;
            mnemonicCode?: string;
            voltage: "MT" | "BT";
            status: "INSTALAR" | "RETIRAR" | "EXISTENTE";
            spansCount: number;
            totalMeters: number;
            spansDetail: string[];
            notes?: string;
            pageNumber: number;
          }>();

          parsedData.detectedCables.forEach((c: any, idx: number) => {
            const rawType = String(c.cableType || "CAA 1/0 AWG").trim();
            const voltage: "MT" | "BT" = c.voltage === "BT" ? "BT" : "MT";
            const status = (String(c.status || "INSTALAR").toUpperCase() === "RETIRAR"
              ? "RETIRAR"
              : String(c.status || "INSTALAR").toUpperCase() === "EXISTENTE"
              ? "EXISTENTE"
              : "INSTALAR") as "INSTALAR" | "RETIRAR" | "EXISTENTE";

            const key = `${rawType.toUpperCase()}__${voltage}__${status}`;
            const spans = Number(c.spansCount) || 1;
            const meters = Number(c.estimatedLengthMeters) || 0;
            const detail = c.spansDetail || (c.fromPole && c.toPole ? `${c.fromPole}-${c.toPole} (${meters}m)` : undefined);

            const existing = cableGroupMap.get(key);
            if (existing) {
              existing.spansCount += spans;
              existing.totalMeters += meters;
              if (detail && !existing.spansDetail.includes(detail)) {
                existing.spansDetail.push(detail);
              }
            } else {
              cableGroupMap.set(key, {
                id: `CABO_${idx + 1}`,
                cableType: rawType,
                mnemonicCode: c.mnemonicCode,
                voltage,
                status,
                spansCount: spans,
                totalMeters: meters,
                spansDetail: detail ? [detail] : [],
                notes: c.notes,
                pageNumber: Number(c.pageNumber || c.pagina || 1),
              });
            }
          });

          // Atualiza parsedData.detectedCables com a lista consolidada por especificação
          parsedData.detectedCables = Array.from(cableGroupMap.values()).map((g) => ({
            id: g.id,
            cableType: g.cableType,
            mnemonicCode: g.mnemonicCode,
            voltage: g.voltage,
            status: g.status,
            spansCount: g.spansCount,
            estimatedLengthMeters: g.totalMeters > 0 ? g.totalMeters : g.spansCount * 35,
            spansDetail: g.spansDetail.join(", "),
            notes: g.notes || `${g.spansCount} vão(s) somando ${g.totalMeters > 0 ? g.totalMeters : g.spansCount * 35}m`,
          }));

          // Adiciona os cabos agregados por especificação aos elementos para reconhecimento e explosão oficial
          parsedData.detectedCables.forEach((c: any) => {
            elementosParaReconhecimento.push({
              id: c.id,
              tipo: "CABO",
              codigo: c.cableType,
              mnemonicCode: c.mnemonicCode,
              tensao: c.voltage === "BT" ? "BT" : (voltageLevel || "13.8kV"),
              status: c.status,
              descricao: c.notes || `Condutor ${c.cableType || ""}`,
              quantidade: c.estimatedLengthMeters,
              pagina: Number(c.pageNumber || 1),
            });
          });
        }

        // Executa a orquestração completa e integrada da Etapa 4
        // Fluxo: Elementos do Projeto -> Simbologia Oficial -> Associação Oficial -> Mnemônico -> Explosão -> Materiais
        const orchestrationResult = processarProjetoComSimbologiaOficial(
          elementosParaReconhecimento,
          fileName || "projeto_analisado"
        );

        parsedData.voltageLevel = voltageLevel || "13.8kV";
        parsedData.officialProcessing = orchestrationResult.officialProcessing;
        parsedData.recognitionAudit = orchestrationResult.recognitionAudit;
        parsedData.relatorioOcorrencias = orchestrationResult.relatorio_ocorrencias;
        const removalMatsCount = orchestrationResult.officialProcessing.materials.filter(
          (m: any) => m.status === "RETIRAR" || String(m.description || "").startsWith("[A RETIRAR]")
        ).length;
        const removalMneCount = orchestrationResult.officialProcessing.groupedMnemonics.filter(
          (m: any) => m.status === "RETIRAR" || String(m.description || "").startsWith("[A RETIRAR]")
        ).length;

        const removalNotice =
          removalMneCount > 0 || removalMatsCount > 0
            ? ` Certificação operacional: foram identificados ${removalMneCount} mnemônico(s) e ${removalMatsCount} material(is) a retirar, consolidados rigorosamente na lista de materiais retirados.`
            : " Certificação operacional: nenhum material ou equipamento a retirar foi identificado no projeto.";

        parsedData.generalSummary =
          (parsedData.generalSummary
            ? `${parsedData.generalSummary}${removalNotice}`
            : `Leitura concluída com a cadeia oficial de simbologia e mnemônicos CEMIG.${removalNotice}`);

        // Armazena no cache em memória para evitar reprocessamento do mesmo arquivo
        analysisCache.set(fileHash, {
          hash: fileHash,
          voltageLevel: voltageLevel || "13.8kV",
          timestamp: Date.now(),
          data: parsedData,
          recognitionAudit: orchestrationResult.recognitionAudit,
          orchestration: orchestrationResult,
          source: "gemini",
          catalog: orchestrationResult.officialProcessing.catalogStats,
        });

        // Registra cálculo na tabela calculos se houver usuário
        if (userId) {
          UserService.saveCalculo({
            userId,
            dadosJson: {
              fileName: fileName || "Projeto",
              voltageLevel: voltageLevel || "13.8kV",
              structures: parsedData?.detectedStructures?.length || 0,
              materials: orchestrationResult?.officialProcessing?.materials?.length || 0,
            },
            cargaTermica: 0,
            metodo: "Explosão de Mnemônicos CEMIG",
          }).catch(console.error);
        }

        return res.json({
          success: true,
          data: parsedData,
          recognitionAudit: orchestrationResult.recognitionAudit,
          orchestration: orchestrationResult,
          source: "gemini",
          catalog: orchestrationResult.officialProcessing.catalogStats,
          cacheHit: false,
          hash: fileHash,
        });
      } catch (pErr: any) {
        console.error("Error parsing/processing Gemini output:", pErr);
        // Fallback gracioso: sintetiza resposta estrutural válida para não travar o usuário
        try {
          const fallbackOrchestration = processarProjetoComSimbologiaOficial([], req.body?.fileName || "projeto.pdf");
          return res.json({
            success: true,
            data: {
              detectedStructures: [],
              detectedPoles: [],
              detectedTransformers: [],
              detectedGuys: [],
              detectedCables: [],
              unrecognizedItems: [],
              generalSummary: "A imagem foi processada, porém o traçado da rede ou a resolução do arquivo não permitiram detectar postes e estruturas com total nitidez. Recomendamos enviar uma imagem com maior aproximação (zoom) ou resolução superior.",
            },
            recognitionAudit: fallbackOrchestration.recognitionAudit,
            orchestration: fallbackOrchestration,
            source: "gemini-fallback",
            catalog: fallbackOrchestration.officialProcessing.catalogStats,
            cacheHit: false,
            hash: fileHash,
          });
        } catch {
          return res.status(422).json({
            success: false,
            error: "Não foi possível interpretar a estrutura retornada pelo modelo de visão. Por favor, tente enviar novamente o arquivo ou uma imagem mais nítida.",
            rawText: responseText?.slice(0, 500),
          });
        }
      }
    } else {
      return res.status(503).json({
        error: "A chave de API do Gemini (GEMINI_API_KEY) não está configurada no servidor. Configure a variável de ambiente GEMINI_API_KEY no painel de controle do Vercel (Project Settings -> Environment Variables) para ativar a leitura de projetos por IA."
      });
    }
  } catch (err: any) {
    console.error("Error in /api/analyze-project:", err);
    const errMsg = String(err?.message || "");
    let friendlyMessage = "Erro ao analisar o arquivo do projeto.";

    let statusCode = 500;
    if (
      errMsg.includes("503") ||
      errMsg.includes("high demand") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("temporarily unavailable") ||
      errMsg.includes("overloaded") ||
      errMsg.includes("spikes in demand")
    ) {
      statusCode = 503;
      friendlyMessage =
        "O serviço de IA está temporariamente com alta demanda (503). Por favor, aguarde alguns segundos e tente novamente.";
    } else if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      statusCode = 429;
      friendlyMessage =
        "Limite de requisições temporário atingido (429). Por favor, aguarde alguns instantes e tente novamente.";
    } else if (errMsg.includes("Internal error encountered") || errMsg.includes("500")) {
      statusCode = 503;
      friendlyMessage =
        "O serviço de IA do Google apresentou uma instabilidade temporária ao analisar a imagem. Por favor, aguarde alguns instantes e tente novamente.";
    } else if (errMsg) {
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) {
          friendlyMessage = `Erro do serviço de IA: ${parsed.error.message}`;
        } else {
          friendlyMessage = errMsg;
        }
      } catch {
        if (errMsg.includes("[Gemini API]")) {
          friendlyMessage = "O serviço de IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns segundos.";
        } else {
          friendlyMessage = errMsg;
        }
      }
    }

    res.status(statusCode).json({
      success: false,
      error: friendlyMessage,
      rawError: err.message,
      isTransient: statusCode !== 500,
    });
  }
});

// Universal Express error handling middleware to always return structured JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Universal Server Error Handler]:", err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || "Ocorreu um erro interno no servidor ao processar a requisição.",
    status,
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor CEMIG rodando na porta ${PORT}`);
  });

  server.keepAliveTimeout = 120000;
  server.headersTimeout = 125000;
  server.timeout = 180000;
}

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
if (!isVercel) {
  startServer();
}

export { app };
export default app;
