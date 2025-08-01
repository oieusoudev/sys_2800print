'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MessageSquare, 
  Send, 
  Calendar, 
  Clock, 
  Euro,
  Eye,
  UserCheck,
  Megaphone,
  Mail,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '@/services/adminService';
import { AdminUser } from '@/types/admin';
import { MonthlyStats } from '@/types/api';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userStats, setUserStats] = useState<MonthlyStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Estados para modais
  const [isGeneralAnnouncementOpen, setIsGeneralAnnouncementOpen] = useState(false);
  const [isSpecificAnnouncementOpen, setIsSpecificAnnouncementOpen] = useState(false);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);

  // Estados para formulários
  const [generalAnnouncement, setGeneralAnnouncement] = useState({
    title: '',
    message: ''
  });
  const [specificAnnouncement, setSpecificAnnouncement] = useState({
    title: '',
    message: '',
    recipient_id: ''
  });

  // Estados para envio
  const [isSendingGeneral, setIsSendingGeneral] = useState(false);
  const [isSendingSpecific, setIsSendingSpecific] = useState(false);

  // Verificar se o usuário é admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user?.is_admin)) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, authLoading, router]);

  // Carregar usuários
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await adminService.getAllUsers();
      setUsers(usersData);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin) {
      loadUsers();
    }
  }, [user]);

  // Carregar estatísticas do usuário
  const loadUserStats = async (userId: string) => {
    setIsStatsLoading(true);
    try {
      const stats = await adminService.getUserMonthlyStats(userId);
      setUserStats(stats);
    } catch (error: any) {
      console.error('Error loading user stats:', error);
      toast.error('Erro ao carregar estatísticas do usuário');
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Enviar aviso geral
  const handleSendGeneralAnnouncement = async () => {
    if (!generalAnnouncement.title.trim() || !generalAnnouncement.message.trim()) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    setIsSendingGeneral(true);
    try {
      await adminService.sendGeneralAnnouncement({
        title: generalAnnouncement.title.trim(),
        message: generalAnnouncement.message.trim()
      });
      
      toast.success('Aviso geral enviado com sucesso!');
      setGeneralAnnouncement({ title: '', message: '' });
      setIsGeneralAnnouncementOpen(false);
    } catch (error: any) {
      console.error('Error sending general announcement:', error);
      toast.error(error.message || 'Erro ao enviar aviso geral');
    } finally {
      setIsSendingGeneral(false);
    }
  };

  // Enviar aviso específico
  const handleSendSpecificAnnouncement = async () => {
    if (!specificAnnouncement.title.trim() || !specificAnnouncement.message.trim()) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    setIsSendingSpecific(true);
    try {
      await adminService.sendSpecificAnnouncement({
        title: specificAnnouncement.title.trim(),
        message: specificAnnouncement.message.trim(),
        recipient_id: specificAnnouncement.recipient_id
      });
      
      const recipientName = users.find(u => u.id === specificAnnouncement.recipient_id)?.full_name;
      toast.success(`Aviso enviado para ${recipientName} com sucesso!`);
      setSpecificAnnouncement({ title: '', message: '', recipient_id: '' });
      setIsSpecificAnnouncementOpen(false);
    } catch (error: any) {
      console.error('Error sending specific announcement:', error);
      toast.error(error.message || 'Erro ao enviar aviso específico');
    } finally {
      setIsSendingSpecific(false);
    }
  };

  // Abrir modal de aviso específico
  const openSpecificAnnouncementModal = (user: AdminUser) => {
    setSpecificAnnouncement({
      title: '',
      message: '',
      recipient_id: user.id
    });
    setIsSpecificAnnouncementOpen(true);
  };

  // Abrir detalhes do usuário
  const openUserDetails = (user: AdminUser) => {
    setSelectedUser(user);
    setUserStats(null);
    setIsUserDetailsOpen(true);
    loadUserStats(user.id);
  };

  if (authLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-slate-900 rounded-full" />
          </div>
          <p className="text-slate-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  const employeeUsers = users.filter(u => !u.is_admin);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Painel de Administração</h1>
              <p className="text-sm text-slate-400">Gerencie funcionários e envie avisos</p>
            </div>
          </div>
          
          <Button
            onClick={() => setIsGeneralAnnouncementOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Aviso Geral
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Total de Funcionários
              </CardTitle>
              <UserCheck className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {employeeUsers.length}
              </div>
              <p className="text-xs text-slate-500">
                Funcionários ativos no sistema
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Usuários Online
              </CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {employeeUsers.filter(u => u.last_login && 
                  new Date(u.last_login).getTime() > Date.now() - 24 * 60 * 60 * 1000
                ).length}
              </div>
              <p className="text-xs text-slate-500">
                Últimas 24 horas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Mês Atual
              </CardTitle>
              <Calendar className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </div>
              <p className="text-xs text-slate-500">
                Período de análise
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Funcionários ({employeeUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-400">Carregando funcionários...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Nome</TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Usuário</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Último Login</TableHead>
                      <TableHead className="text-slate-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                          Nenhum funcionário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeeUsers.map((user) => (
                        <TableRow key={user.id} className="border-slate-700">
                          <TableCell className="text-slate-300 font-medium">
                            {user.full_name}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {user.username}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.is_active ? "default" : "secondary"}
                              className={user.is_active ? "bg-green-600" : "bg-slate-600"}
                            >
                              {user.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString('pt-PT')
                              : 'Nunca'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openUserDetails(user)}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openSpecificAnnouncementModal(user)}
                                className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal de Aviso Geral */}
      <Dialog open={isGeneralAnnouncementOpen} onOpenChange={setIsGeneralAnnouncementOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Megaphone className="h-5 w-5 text-blue-400" />
              <span>Enviar Aviso Geral</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="general-title" className="text-slate-300">Título</Label>
              <Input
                id="general-title"
                placeholder="Digite o título do aviso"
                value={generalAnnouncement.title}
                onChange={(e) => setGeneralAnnouncement({
                  ...generalAnnouncement,
                  title: e.target.value
                })}
                className="bg-slate-700 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label htmlFor="general-message" className="text-slate-300">Mensagem</Label>
              <Textarea
                id="general-message"
                placeholder="Digite a mensagem do aviso"
                value={generalAnnouncement.message}
                onChange={(e) => setGeneralAnnouncement({
                  ...generalAnnouncement,
                  message: e.target.value
                })}
                className="bg-slate-700 border-slate-600 text-slate-100 min-h-[100px]"
              />
            </div>
            <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                📢 Este aviso será enviado para todos os {employeeUsers.length} funcionários
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsGeneralAnnouncementOpen(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendGeneralAnnouncement}
                disabled={isSendingGeneral}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSendingGeneral ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Aviso
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Aviso Específico */}
      <Dialog open={isSpecificAnnouncementOpen} onOpenChange={setIsSpecificAnnouncementOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-green-400" />
              <span>Enviar Aviso Específico</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {specificAnnouncement.recipient_id && (
              <div className="bg-green-900/50 border border-green-600 rounded-lg p-3">
                <p className="text-green-300 text-sm">
                  📧 Enviando para: {users.find(u => u.id === specificAnnouncement.recipient_id)?.full_name}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="specific-title" className="text-slate-300">Título</Label>
              <Input
                id="specific-title"
                placeholder="Digite o título do aviso"
                value={specificAnnouncement.title}
                onChange={(e) => setSpecificAnnouncement({
                  ...specificAnnouncement,
                  title: e.target.value
                })}
                className="bg-slate-700 border-slate-600 text-slate-100"
              />
            </div>
            <div>
              <Label htmlFor="specific-message" className="text-slate-300">Mensagem</Label>
              <Textarea
                id="specific-message"
                placeholder="Digite a mensagem do aviso"
                value={specificAnnouncement.message}
                onChange={(e) => setSpecificAnnouncement({
                  ...specificAnnouncement,
                  message: e.target.value
                })}
                className="bg-slate-700 border-slate-600 text-slate-100 min-h-[100px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsSpecificAnnouncementOpen(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendSpecificAnnouncement}
                disabled={isSendingSpecific}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSendingSpecific ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Aviso
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Usuário */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-400" />
              <span>Detalhes do Funcionário</span>
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Informações do usuário */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Informações Pessoais</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Nome:</span>
                    <p className="text-white">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>
                    <p className="text-white">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Usuário:</span>
                    <p className="text-white">{selectedUser.username}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span>
                    <Badge 
                      variant={selectedUser.is_active ? "default" : "secondary"}
                      className={selectedUser.is_active ? "bg-green-600" : "bg-slate-600"}
                    >
                      {selectedUser.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Estatísticas mensais */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Estatísticas do Mês Atual</h3>
                {isStatsLoading ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Carregando estatísticas...</p>
                  </div>
                ) : userStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span className="text-slate-400 text-sm">Horas Totais</span>
                      </div>
                      <p className="text-xl font-bold text-white">{userStats.total_hours.toFixed(1)}h</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-4 w-4 text-green-400" />
                        <span className="text-slate-400 text-sm">Dias Trabalhados</span>
                      </div>
                      <p className="text-xl font-bold text-white">{userStats.working_days}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span className="text-slate-400 text-sm">Horas Extras</span>
                      </div>
                      <p className="text-xl font-bold text-yellow-400">{userStats.overtime_hours.toFixed(1)}h</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Euro className="h-4 w-4 text-green-400" />
                        <span className="text-slate-400 text-sm">Valor Extras</span>
                      </div>
                      <p className="text-xl font-bold text-green-400">€{userStats.overtime_pay.toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-4">Nenhuma estatística disponível</p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsUserDetailsOpen(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setIsUserDetailsOpen(false);
                    openSpecificAnnouncementModal(selectedUser);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Aviso
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}