import { useState, useEffect } from 'react';
import { MessageSquare, Users, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/stats');
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Messages totaux', value: stats?.totalMessages || 0, icon: MessageSquare, color: 'bg-blue-500' },
    { label: 'Conversations', value: stats?.totalConversations || 0, icon: Users, color: 'bg-green-500' },
    { label: "Messages aujourd'hui", value: stats?.todayMessages || 0, icon: TrendingUp, color: 'bg-amber-500' },
    { label: 'Conversations actives', value: stats?.activeConversations || 0, icon: Activity, color: 'bg-purple-500' },
  ];

  const senderLabels = { user: 'Utilisateurs', bot: 'Bot IA', admin: 'Admin' };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages per day */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages (7 derniers jours)</h3>
          {stats?.messagesPerDay?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('fr', { day: '2-digit', month: '2-digit' })} />
                <YAxis />
                <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString('fr')} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Messages by sender */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des messages</h3>
          {stats?.messagesBySender?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.messagesBySender.map(s => ({ ...s, name: senderLabels[s.sender] || s.sender }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="count"
                >
                  {stats.messagesBySender.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
