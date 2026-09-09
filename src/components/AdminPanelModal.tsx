import React, { useState, useEffect } from "react";
import {
  AdminUserListItem,
  LoginRecord,
  EmailNotificationLog,
  UserStatus,
  authApi,
  ADMIN_EMAIL,
} from "../services/authService";
import {
  Shield,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Mail,
  Smartphone,
  Calendar,
  X,
  PlusCircle,
  Lock,
  Unlock,
  Layers,
  Send,
  Zap,
  KeyRound,
} from "lucide-react";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "logins" | "notifications" | "calculos">("users");

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [notifications, setNotifications] = useState<EmailNotificationLog[]>([]);
  const [calculos, setCalculos] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Extend days custom dialog state
  const [selectedUserForExtend, setSelectedUserForExtend] = useState<AdminUserListItem | null>(null);
  const [extendDaysAmount, setExtendDaysAmount] = useState<number>(7);

  // Admin direct reset password dialog state
  const [selectedUserForReset, setSelectedUserForReset] = useState<AdminUserListItem | null>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState<string>("");
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setActionFeedback(null);
      const [usersList, loginsList, notifsList] = await Promise.all([
        authApi.getAdminUsers(currentUserEmail),
        authApi.getAdminLogins(currentUserEmail),
        authApi.getAdminNotifications(currentUserEmail),
      ]);
      setUsers(usersList);
      setLogins(loginsList);
      setNotifications(notifsList);

      // Also fetch calculos
      const calcRes = await fetch("/api/calculos");
      if (calcRes.ok) {
        const calcData = await calcRes.json();
        if (calcData.success) {
          setCalculos(calcData.calculos || []);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados do painel de administração:", err);
      setActionFeedback(`Erro ao carregar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUserEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      fetchAdminData();
    }
  }, [isOpen, currentUserEmail]);

  const handleUpdateStatus = async (
    targetUserId: string,
    newStatus: UserStatus,
    extendDays?: number
  ) => {
    try {
      setIsLoading(true);
      await authApi.updateUserStatus(currentUserEmail, targetUserId, newStatus, extendDays);
      setActionFeedback(`Status atualizado com sucesso para: ${newStatus.toUpperCase()}${extendDays ? ` (+${extendDays} dias)` : ""}`);
      setSelectedUserForExtend(null);
      await fetchAdminData();
    } catch (err: any) {
      setActionFeedback(`Falha ao alterar status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminResetPassword = async () => {
    if (!selectedUserForReset) return;
    if (!newPasswordForUser || newPasswordForUser.length < 6) {
      alert("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    try {
      setIsResettingPassword(true);
      await authApi.adminResetUserPassword(currentUserEmail, selectedUserForReset.id, newPasswordForUser);
      setActionFeedback(`Senha do usuário ${selectedUserForReset.nome} (${selectedUserForReset.email}) alterada com sucesso.`);
      setSelectedUserForReset(null);
      setNewPasswordForUser("");
    } catch (err: any) {
      alert(err.message || "Erro ao redefinir senha.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Strictly enforce that only patricioaug@gmail.com can render the Admin Panel
  if (!isOpen || currentUserEmail.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.device_serial && u.device_serial.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || u.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalUsers = users.length;
  const liberadosCount = users.filter((u) => u.status === "liberado").length;
  const trialCount = users.filter((u) => u.status === "trial").length;
  const bloqueadosCount = users.filter((u) => u.status === "bloqueado").length;

  return (
    <div
      id="admin-panel-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-1.5 sm:p-6 overflow-y-auto"
    >
      <div
        id="admin-panel-container"
        className="relative w-full max-w-6xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden"
      >
        {/* Header - Compact on mobile */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-3.5 sm:px-6 py-2.5 sm:py-3.5 text-white flex items-center justify-between gap-2 border-b border-indigo-900/50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 shrink-0">
              <Shield className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-white tracking-wide truncate">
                  Painel do Administrador
                </h2>
                <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-amber-400/30 shrink-0">
                  Acesso Mestre
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 truncate">
                {ADMIN_EMAIL} • Gestão de Acessos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="admin-refresh-btn"
              type="button"
              onClick={fetchAdminData}
              disabled={isLoading}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              id="admin-close-btn"
              type="button"
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Fechar painel"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards - Compact 5-item responsive row */}
        <div className="bg-slate-50 border-b border-slate-200 px-2.5 sm:px-6 py-2 sm:py-2.5 grid grid-cols-5 gap-1.5 sm:gap-3 text-xs shrink-0">
          <div className="bg-white p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-xs text-center sm:text-left">
            <div className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1 mb-0.5 text-[9px] sm:text-xs">
              <Users className="w-3 h-3 text-indigo-600 shrink-0" />
              <span className="truncate">Usuários</span>
            </div>
            <div className="text-sm sm:text-lg font-bold text-slate-800 leading-none sm:leading-normal">{totalUsers}</div>
          </div>

          <div className="bg-white p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-xs text-center sm:text-left">
            <div className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1 mb-0.5 text-[9px] sm:text-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">Liberados</span>
            </div>
            <div className="text-sm sm:text-lg font-bold text-emerald-600 leading-none sm:leading-normal">{liberadosCount}</div>
          </div>

          <div className="bg-white p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-xs text-center sm:text-left">
            <div className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1 mb-0.5 text-[9px] sm:text-xs">
              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate">Trial</span>
            </div>
            <div className="text-sm sm:text-lg font-bold text-amber-600 leading-none sm:leading-normal">{trialCount}</div>
          </div>

          <div className="bg-white p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-xs text-center sm:text-left">
            <div className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1 mb-0.5 text-[9px] sm:text-xs">
              <XCircle className="w-3 h-3 text-red-600 shrink-0" />
              <span className="truncate">Bloqueados</span>
            </div>
            <div className="text-sm sm:text-lg font-bold text-red-600 leading-none sm:leading-normal">{bloqueadosCount}</div>
          </div>

          <div className="bg-white p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-xs text-center sm:text-left">
            <div className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1 mb-0.5 text-[9px] sm:text-xs">
              <Zap className="w-3 h-3 text-purple-600 shrink-0" />
              <span className="truncate">Logins</span>
            </div>
            <div className="text-sm sm:text-lg font-bold text-purple-700 leading-none sm:leading-normal">{logins.length}</div>
          </div>
        </div>

        {/* Tab Navigation - Horizontal scrollable and compact buttons */}
        <div className="flex border-b border-slate-200 bg-white px-2.5 sm:px-6 overflow-x-auto shrink-0 gap-1">
          <button
            id="admin-tab-users-btn"
            type="button"
            onClick={() => setActiveTab("users")}
            className={`py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === "users"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuários ({users.length})</span>
          </button>

          <button
            id="admin-tab-logins-btn"
            type="button"
            onClick={() => setActiveTab("logins")}
            className={`py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === "logins"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Logins ({logins.length})</span>
          </button>

          <button
            id="admin-tab-notifications-btn"
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === "notifications"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Notificações ({notifications.length})</span>
          </button>

          <button
            id="admin-tab-calculos-btn"
            type="button"
            onClick={() => setActiveTab("calculos")}
            className={`py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === "calculos"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cálculos ({calculos.length})</span>
          </button>
        </div>

        {/* Action feedback message */}
        {actionFeedback && (
          <div className="mx-3 sm:mx-6 mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between shrink-0">
            <span>{actionFeedback}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Tab View */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {/* USERS TAB */}
          {activeTab === "users" && (
            <div className="space-y-3">
              {/* Search & Filter bar - Compact */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    id="admin-search-users-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                  <select
                    id="admin-filter-status-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 font-medium focus:outline-none"
                  >
                    <option value="ALL">Todos os status</option>
                    <option value="trial">Em Trial</option>
                    <option value="liberado">Liberados (Pagantes)</option>
                    <option value="bloqueado">Bloqueados</option>
                  </select>
                </div>
              </div>

              {/* Mobile User Cards View (sm:hidden) - compact, clear, all buttons visible */}
              <div className="sm:hidden space-y-2.5">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic text-xs bg-white rounded-xl border border-slate-200">
                    Nenhum usuário encontrado para os critérios de busca.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isUserAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                    const isExpired = u.trialInfo?.isExpired;
                    const daysLeft = u.trialInfo?.daysRemaining ?? 0;

                    return (
                      <div key={u.id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                        {/* User Header */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1">
                              <span className="truncate">{u.nome}</span>
                              {isUserAdmin && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold shrink-0">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">{u.email}</div>
                          </div>

                          <div className="shrink-0">
                            {isUserAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200">
                                <Shield className="w-2.5 h-2.5 text-indigo-600" />
                                Vitalício
                              </span>
                            ) : u.status === "liberado" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                                Liberado
                              </span>
                            ) : u.status === "bloqueado" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                <Lock className="w-2.5 h-2.5 text-red-600" />
                                Bloqueado
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isExpired
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {isExpired ? "Expirado" : `Trial (${daysLeft}d)`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Details strip */}
                        <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-slate-600">
                          <div>
                            <span className="text-slate-400">Avaliação: </span>
                            {isUserAdmin ? (
                              <span className="text-indigo-700 font-semibold">Permanente</span>
                            ) : u.status === "liberado" ? (
                              <span className="text-emerald-700 font-semibold">Ilimitado</span>
                            ) : isExpired ? (
                              <span className="text-red-600 font-bold">Expirado</span>
                            ) : (
                              <span className="text-emerald-600 font-bold">{daysLeft} dias restantes</span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400">Logins: </span>
                            <span className="font-bold text-slate-800">{u.loginCount}</span>
                          </div>
                        </div>

                        {/* Action buttons toolbar - Compact 4 buttons neatly aligned side-by-side */}
                        {!isUserAdmin && (
                          <div className="grid grid-cols-4 gap-1 pt-0.5">
                            {u.status !== "liberado" ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(u.id, "liberado")}
                                className="py-1 px-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-0.5 shadow-xs cursor-pointer"
                                title="Liberar acesso como assinante pagante"
                              >
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Liberar</span>
                              </button>
                            ) : (
                              <div className="py-1 px-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center justify-center gap-0.5 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Ativo</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedUserForExtend(u)}
                              className="py-1 px-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-0.5 shadow-xs cursor-pointer"
                              title="Estender avaliação trial"
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>+Dias</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForReset(u);
                                setNewPasswordForUser("");
                              }}
                              className="py-1 px-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold transition-colors flex items-center justify-center gap-0.5 shadow-xs border border-slate-300 cursor-pointer"
                              title="Redefinir senha do usuário"
                            >
                              <KeyRound className="w-3 h-3 shrink-0 text-slate-600" />
                              <span>Senha</span>
                            </button>

                            {u.status !== "bloqueado" ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(u.id, "bloqueado")}
                                className="py-1 px-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
                                title="Bloquear usuário"
                              >
                                <Lock className="w-3 h-3 shrink-0" />
                                <span>Bloq.</span>
                              </button>
                            ) : (
                              <div className="py-1 px-1 rounded-md bg-red-50 text-red-600 text-[10px] font-semibold flex items-center justify-center gap-0.5 border border-red-200">
                                <Lock className="w-3 h-3 shrink-0" />
                                <span>Bloq.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Users Table (hidden sm:block) */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Usuário</th>
                      <th className="py-2.5 px-3">Status Atual</th>
                      <th className="py-2.5 px-3">Trial / Avaliação</th>
                      <th className="py-2.5 px-3">Dispositivo</th>
                      <th className="py-2.5 px-3 text-center">Logins</th>
                      <th className="py-2.5 px-3 text-right">Ações de Liberação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          Nenhum usuário encontrado para os critérios de busca.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isUserAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                        const isExpired = u.trialInfo?.isExpired;
                        const daysLeft = u.trialInfo?.daysRemaining ?? 0;

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900">{u.nome}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                              {isUserAdmin && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                  ADMINISTRADOR
                                </span>
                              )}
                            </td>

                            <td className="py-2 px-3">
                              {isUserAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200">
                                  <Shield className="w-3 h-3 text-indigo-600" />
                                  Admin Vitalício
                                </span>
                              ) : u.status === "liberado" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                  Liberado
                                </span>
                              ) : u.status === "bloqueado" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-semibold">
                                  <Lock className="w-3 h-3 text-red-600" />
                                  Bloqueado
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isExpired
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {isExpired ? "Trial Expirado" : `Trial (${daysLeft}d)`}
                                </span>
                              )}
                            </td>

                            <td className="py-2 px-3">
                              {isUserAdmin ? (
                                <span className="text-indigo-700 font-semibold text-xs">
                                  Acesso Permanente
                                </span>
                              ) : u.status === "liberado" ? (
                                <span className="text-emerald-700 font-medium">Acesso Ilimitado</span>
                              ) : (
                                <div>
                                  <div className="text-[11px] text-slate-700">
                                    {isExpired ? (
                                      <span className="font-bold text-red-600">Período encerrado</span>
                                    ) : (
                                      <span className="font-bold text-emerald-600">
                                        {daysLeft} dia{daysLeft > 1 ? "s" : ""} restante{daysLeft > 1 ? "s" : ""}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Fim: {new Date(u.trial_fim).toLocaleDateString("pt-BR")}
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                              {u.device_serial ? (
                                <span title={u.device_serial}>
                                  {u.device_serial.length > 12
                                    ? `${u.device_serial.substring(0, 12)}...`
                                    : u.device_serial}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              )}
                            </td>

                            <td className="py-2 px-3 font-semibold text-slate-700 text-center">
                              {u.loginCount}
                            </td>

                            <td className="py-2 px-3 text-right">
                              {isUserAdmin ? (
                                <span className="text-[11px] text-slate-400 font-medium italic">
                                  Administrador Mestre
                                </span>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  {u.status !== "liberado" && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(u.id, "liberado")}
                                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                      title="Liberar acesso como assinante pagante"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Liberar</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setSelectedUserForExtend(u)}
                                    className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Estender período de avaliação trial"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>+Dias</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedUserForReset(u);
                                      setNewPasswordForUser("");
                                    }}
                                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xs border border-slate-300 cursor-pointer"
                                    title="Redefinir senha deste usuário diretamente"
                                  >
                                    <KeyRound className="w-3 h-3 text-slate-600" />
                                    <span>Senha</span>
                                  </button>

                                  {u.status !== "bloqueado" && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(u.id, "bloqueado")}
                                      className="px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Bloquear usuário"
                                    >
                                      <Lock className="w-3 h-3" />
                                      <span>Bloquear</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOGINS TAB */}
          {activeTab === "logins" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Aviso Automático:</strong> A cada login realizado, o sistema dispara
                  automaticamente uma notificação de acesso com nome, e-mail e data/hora para{" "}
                  <strong>{ADMIN_EMAIL}</strong>.
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Data e Hora</th>
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Endereço IP</th>
                      <th className="py-3 px-4">Dispositivo</th>
                      <th className="py-3 px-4 text-center">E-mail Enviado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {logins.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          Nenhum login registrado até o momento.
                        </td>
                      </tr>
                    ) : (
                      logins.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-800 font-medium">
                            {l.data_hora_formatada || new Date(l.data_hora).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{l.user_name}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{l.user_email}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{l.ip}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {l.device_serial || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Enviado p/ {ADMIN_EMAIL}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-200">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic text-xs">
                    Nenhum log de notificação registrado no momento.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-4 bg-white hover:bg-slate-50 transition-colors text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{notif.subject}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(notif.timestamp).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div className="text-slate-600 whitespace-pre-line font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        {notif.body}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Destinatário: <strong>{notif.recipient}</strong></span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          {notif.status === "enviado_smtp" ? "Enviado por E-mail" : "Registrado no Servidor"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* CALCULOS TAB */}
          {activeTab === "calculos" && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Projeto / Arquivo</th>
                      <th className="py-3 px-4">Estruturas / Materiais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {calculos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Nenhum cálculo registrado ainda.
                        </td>
                      </tr>
                    ) : (
                      calculos.map((calc) => (
                        <tr key={calc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {new Date(calc.data).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {calc.user_email || calc.user_id}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{calc.metodo}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {calc.dados_json?.fileName || "Prancha Técnica"} ({calc.dados_json?.voltageLevel || "13.8kV"})
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-indigo-700">
                              {calc.dados_json?.structures || 0} estruturas
                            </span>{" "}
                            • {calc.dados_json?.materials || 0} materiais
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Dialog for Extending Days */}
        {selectedUserForExtend && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 sm:p-5 w-full max-w-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Estender Avaliação (Trial)
              </h3>
              <p className="text-xs text-slate-600 mb-3 truncate">
                Usuário: <strong>{selectedUserForExtend.nome}</strong>
              </p>

              <div className="space-y-2.5 mb-3.5">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Quantidade de dias adicionais:
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[7, 15, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtendDaysAmount(days)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                        extendDaysAmount === days
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      +{days} Dias
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForExtend(null)}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(selectedUserForExtend.id, "trial", extendDaysAmount)
                  }
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Confirmar Extensão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dialog for Admin Resetting User Password */}
        {selectedUserForReset && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 sm:p-5 w-full max-w-sm">
              <div className="flex items-center gap-1.5 mb-1.5 text-indigo-700">
                <KeyRound className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900">
                  Redefinir Senha do Usuário
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-2.5 truncate">
                Usuário: <strong>{selectedUserForReset.nome}</strong> ({selectedUserForReset.email})
              </p>

              <div className="space-y-1.5 mb-3.5">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Nova Senha para este Usuário:
                </label>
                <input
                  type="text"
                  value={newPasswordForUser}
                  onChange={(e) => setNewPasswordForUser(e.target.value)}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  autoFocus
                />
                <p className="text-[10px] text-slate-500">
                  Como administrador mestre, você pode definir a senha diretamente para o usuário.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForReset(null);
                    setNewPasswordForUser("");
                  }}
                  disabled={isResettingPassword}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isResettingPassword || newPasswordForUser.trim().length < 6}
                  onClick={handleAdminResetPassword}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isResettingPassword ? "Salvando..." : "Salvar Senha"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 shrink-0">
          <span className="truncate">
            CalcPro • <strong>{ADMIN_EMAIL}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors cursor-pointer text-xs shrink-0"
          >
            Voltar ao App
          </button>
        </div>
      </div>
    </div>
  );
};
