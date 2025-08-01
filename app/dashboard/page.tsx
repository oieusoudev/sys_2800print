'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType } from '@/types';
import { LocationCard } from '@/components/dashboard/LocationCard';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { PunchCard } from '@/components/dashboard/PunchCard';
import { TimeTable } from '@/components/dashboard/TimeTable';
import { BreakTimer } from '@/components/dashboard/BreakTimer';
import { BiometricSettings } from '@/components/dashboard/BiometricSettings';
import { DigitalClock } from '@/components/dashboard/DigitalClock';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-slate-900 rounded-full" />
          </div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-slate-900 rounded-full" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Folha de Ponto</h1>
              <p className="text-sm text-slate-400"> 
                Bem-vindo, {user.full_name || user.username}
                {user.is_admin && <span className="ml-2 text-yellow-400">(Admin)</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <DigitalClock />
            {!user.is_admin && <NotificationBell />}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Admin Panel Link */}
        {user.is_admin && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Painel de Administração</h3>
                <p className="text-blue-100 text-sm">Gerencie funcionários e envie avisos</p>
              </div>
              <Button
                onClick={() => router.push('/admin')}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Acessar Painel
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <StatsCards />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <LocationCard />
            <PunchCard />
            {!user.is_admin && <BreakTimer />}
            {!user.is_admin && <BiometricSettings />}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            {!user.is_admin && <TimeTable />}
            {user.is_admin && (
              <div className="bg-slate-800 border-slate-700 rounded-lg p-8 text-center">
                <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Painel de Administração</h3>
                <p className="text-slate-400 mb-4">
                  Acesse o painel de administração para gerenciar funcionários e enviar avisos.
                </p>
                <Button
                  onClick={() => router.push('/admin')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Ir para Painel de Admin
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}