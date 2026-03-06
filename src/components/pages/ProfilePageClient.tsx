"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

interface ProfileData {
  height?: number;
  weight?: number;
  birthDate?: string;
  lastSync?: string;
}

export default function ProfilePageClient() {
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState<ProfileData>({
    height: 170, // Default height in cm (user mentioned 1.70m)
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load profile data from localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("kkfit_profile");
      if (savedData) {
        setProfileData(JSON.parse(savedData));
      }
      // Set last sync time from session storage or default
      const syncTime = sessionStorage.getItem("kkfit_last_sync");
      if (syncTime) {
        setLastSyncTime(syncTime);
      } else {
        // Default to now if no sync recorded
        setLastSyncTime(new Date().toISOString());
      }
    } catch (err) {
      console.error("Error loading profile data:", err);
      setError("Erro ao carregar dados do perfil");
    }
    setLoading(false);
  }, []);

  const saveProfile = (data: ProfileData) => {
    localStorage.setItem("kkfit_profile", JSON.stringify(data));
    setProfileData(data);
    setIsEditing(false);
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = () => {
    if (!profileData.weight || !profileData.height) return null;
    const heightM = profileData.height / 100;
    return profileData.weight / (heightM * heightM);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Abaixo do peso", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (bmi < 25) return { label: "Peso normal", color: "text-green-400", bg: "bg-green-500/20" };
    if (bmi < 30) return { label: "Sobrepeso", color: "text-yellow-400", bg: "bg-yellow-500/20" };
    return { label: "Obesidade", color: "text-red-400", bg: "bg-red-500/20" };
  };

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-red-400 text-lg">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(bmi) : null;
  const age = calculateAge(profileData.birthDate);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              width={96}
              height={96}
              className="rounded-full border-4 border-blue-500/30 w-24 h-24"
              unoptimized
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-500/20 border-4 border-blue-500/30 flex items-center justify-center text-4xl text-blue-400 font-bold">
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "?"}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mt-4">{session?.user?.name || "Usuário"}</h1>
        <p className="text-slate-400">{session?.user?.email}</p>
      </div>

      {/* Profile Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Informações Pessoais</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isEditing ? "Cancelar" : "Editar"}
            </button>
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  value={profileData.height || ""}
                  onChange={(e) => setProfileData({ ...profileData, height: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="170"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  value={profileData.weight || ""}
                  onChange={(e) => setProfileData({ ...profileData, weight: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-blue-500"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={profileData.birthDate || ""}
                  onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => saveProfile(profileData)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Salvar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Altura</span>
                <span className="text-white font-medium">{profileData.height ? `${profileData.height} cm` : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Peso</span>
                <span className="text-white font-medium">{profileData.weight ? `${profileData.weight} kg` : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Idade</span>
                <span className="text-white font-medium">{age !== null ? `${age} anos` : "—"}</span>
              </div>
            </div>
          )}
        </div>

        {/* BMI Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Índice de Massa Corporal (IMC)</h2>
          
          {bmi && bmiCategory ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-20 h-20 rounded-full ${bmiCategory.bg} flex items-center justify-center`}>
                  <span className={`text-2xl font-bold ${bmiCategory.color}`}>
                    {bmi.toFixed(1)}
                  </span>
                </div>
                <div>
                  <p className={`text-lg font-semibold ${bmiCategory.color}`}>
                    {bmiCategory.label}
                  </p>
                  <p className="text-slate-400 text-sm">
                    Baseado no peso atual
                  </p>
                </div>
              </div>
              
              {/* BMI Scale */}
              <div className="mt-4">
                <div className="h-2 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 rounded-full"></div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>18.5</span>
                  <span>25</span>
                  <span>30</span>
                </div>
                {bmi && (
                  <div className="mt-2">
                    <div 
                      className="w-3 h-3 bg-white rounded-full absolute transform -translate-x-1/2"
                      style={{ 
                        left: `${Math.min(Math.max((bmi - 15) / 20 * 100, 0), 100)}%`,
                        position: "relative"
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-400">Preencha sua altura e peso para calcular o IMC</p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
              >
                Adicionar informações →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sync Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Sincronização Google Fit</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-green-400">✓</span>
          </div>
          <div>
            <p className="text-white font-medium">Última sincronização</p>
            <p className="text-slate-400 text-sm">
              {lastSyncTime 
                ? new Date(lastSyncTime).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "Nunca"
              }
            </p>
          </div>
        </div>
        <p className="text-slate-500 text-xs mt-4">
          Os dados são sincronizados automaticamente com o Google Fit ao acessar o dashboard.
        </p>
      </div>

      {/* Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Configurações</h2>
        <div className="space-y-3">
          <button
            onClick={() => {
              localStorage.removeItem("kkfit_profile");
              sessionStorage.removeItem("kkfit_last_sync");
              window.location.reload();
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span className="text-slate-300">Limpar dados locais</span>
            <span className="text-slate-500">🗑️</span>
          </button>
        </div>
      </div>
    </div>
  );
}
