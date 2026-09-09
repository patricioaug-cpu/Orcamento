import React, { useState } from "react";
import {
  SafeUser,
  UserTrialInfo,
  authApi,
  getOrCreateDeviceSerial,
} from "../services/authService";
import { CalcProLogo } from "./CalcProLogo";
import {
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Smartphone,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";

interface AuthModalProps {
  onSuccess: (user: SafeUser, trialInfo: UserTrialInfo) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [deviceSerial] = useState<string>(() => getOrCreateDeviceSerial());

  // Form states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot / Reset states
  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isDirectReset, setIsDirectReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email || !password) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authApi.login(email.trim(), password);
      setSuccessMessage("Login efetuado com sucesso!");
      setTimeout(() => {
        onSuccess(res.user, res.trialInfo);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || "E-mail ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!nome.trim() || !email.trim() || !password) {
      setErrorMessage("Preencha todos os campos obrigatórios.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authApi.register(nome.trim(), email.trim(), password);
      setSuccessMessage("Cadastro realizado com sucesso! Trial de 7 dias ativado.");
      setTimeout(() => {
        onSuccess(res.user, res.trialInfo);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao realizar cadastro.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setErrorMessage("Informe o e-mail cadastrado na conta.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authApi.forgotPassword(email.trim());
      if (res.directReset && res.token) {
        setIsDirectReset(true);
        setResetToken(res.token);
        setResetCode("");
        setSuccessMessage(
          "Conta localizada com sucesso! Digite sua nova senha abaixo para redefinir o acesso."
        );
      } else {
        setIsDirectReset(false);
        setResetToken("");
        setResetCode("");
        setSuccessMessage(
          res.message ||
            "Código de verificação enviado para seu e-mail cadastrado. Verifique sua caixa de entrada e pasta de spam."
        );
      }
      setResetStep("verify");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao solicitar recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!isDirectReset && !resetCode.trim()) {
      setErrorMessage("Preencha o código de recuperação enviado para seu e-mail.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Digite sua nova senha.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      await authApi.resetPassword({
        email: email.trim(),
        code: !isDirectReset ? resetCode.trim() : undefined,
        token: isDirectReset ? resetToken : undefined,
        newPassword,
      });
      setSuccessMessage("Senha redefinida com sucesso! Você já pode entrar com a nova senha.");
      setTimeout(() => {
        setMode("login");
        setPassword(newPassword);
        setResetStep("request");
        setResetToken("");
        setResetCode("");
        setIsDirectReset(false);
        setSuccessMessage("Senha atualizada! Clique em 'Entrar no Sistema' para acessar.");
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao redefinir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        id="auth-modal-card"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 text-white text-center">
          <div className="flex justify-center">
            <CalcProLogo />
          </div>
        </div>

        {/* Tab Selector */}
        {mode !== "forgot" && (
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setMode("login");
                resetMessages();
              }}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                mode === "login"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Entrar (Login)
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setMode("register");
                resetMessages();
              }}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                mode === "register"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Criar Conta (Cadastro)
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">
          {/* Notification Alerts */}
          {errorMessage && (
            <div
              id="auth-error-alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              id="auth-success-alert"
              className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Senha
                  </label>
                  <button
                    id="forgot-password-link"
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      resetMessages();
                      setResetStep("request");
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    id="toggle-login-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 cursor-pointer"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="submit-login-btn"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Acessando...</span>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500">
                  Novo por aqui?{" "}
                  <button
                    id="switch-to-register-link"
                    type="button"
                    onClick={() => {
                      setMode("register");
                      resetMessages();
                    }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Crie sua conta (7 dias grátis)
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-900 text-xs">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>7 dias de avaliação gratuita</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="register-nome-input"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Engenheiro Carlos Silva"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="register-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="register-password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    id="toggle-register-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 cursor-pointer"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="submit-register-btn"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Cadastrando...</span>
                ) : (
                  <>
                    <span>Cadastrar e Ativar 7 Dias</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500">
                  Já possui uma conta?{" "}
                  <button
                    id="switch-to-login-link"
                    type="button"
                    onClick={() => {
                      setMode("login");
                      resetMessages();
                    }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Entrar agora
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === "forgot" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Recuperação de Senha</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    resetMessages();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Voltar ao login
                </button>
              </div>

              {resetStep === "request" ? (
                <form onSubmit={handleRequestResetCode} className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Informe o e-mail cadastrado na sua conta para redefinir sua senha com segurança.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail Cadastrado
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="forgot-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    id="request-reset-code-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? "Verificando..." : "Continuar Recuperação"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleExecuteResetPassword} className="space-y-3.5">
                  {isDirectReset ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900">Conta Confirmada</p>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          E-mail identificado: <strong>{email}</strong>. Digite sua nova senha abaixo para restaurar o acesso.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900">Código enviado para seu e-mail!</p>
                          <p className="text-blue-800 text-[11px] mt-0.5">
                            Verifique a caixa de entrada (e pasta de spam) em <strong>{email}</strong>. Digite o código de 6 dígitos recebido e crie sua nova senha abaixo.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Código de 6 Dígitos
                        </label>
                        <input
                          id="reset-code-input"
                          type="text"
                          required
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          placeholder="Ex: 123456"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tracking-widest font-mono text-center font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="reset-new-password-input"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                      />
                      <button
                        type="button"
                        id="toggle-reset-new-password-visibility"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 cursor-pointer"
                        title={showNewPassword ? "Ocultar senha" : "Ver senha"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    id="execute-reset-password-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? "Salvando..." : "Salvar Nova Senha"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetStep("request");
                      resetMessages();
                    }}
                    className="w-full py-1.5 text-xs text-indigo-600 hover:text-indigo-800 text-center font-medium cursor-pointer"
                  >
                    {isDirectReset ? "Alterar e-mail informado" : "Não recebeu? Reenviar código para meu e-mail"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Device serial identification */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              ID do Dispositivo:
            </span>
            <span className="font-mono text-slate-600 font-medium">{deviceSerial}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
