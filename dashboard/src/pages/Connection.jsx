import { useState, useEffect } from 'react';
import { Wifi, WifiOff, QrCode, RefreshCw, LogOut } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api';

function Connection() {
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();

    const socket = io('http://localhost:3001');

    socket.on('whatsapp:status', (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'connected') {
        setQrCode(null);
      }
    });

    socket.on('whatsapp:qr', (qr) => {
      setQrCode(qr);
      setStatus('qr');
    });

    return () => socket.disconnect();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/chats/whatsapp/status');
      setStatus(data.status);
      setQrCode(data.qrCode);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Déconnecter WhatsApp ?')) return;
    try {
      await api.post('/chats/whatsapp/logout');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Connexion WhatsApp</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {/* Status indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {status === 'connected' ? (
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {status === 'connected' ? 'Connecté' : status === 'qr' ? 'En attente de scan' : 'Déconnecté'}
              </p>
              <p className="text-sm text-gray-500">
                {status === 'connected'
                  ? 'WhatsApp est connecté et opérationnel'
                  : status === 'qr'
                  ? 'Scannez le QR code avec votre téléphone'
                  : 'WhatsApp n\'est pas connecté'}
              </p>
            </div>
          </div>

          {status === 'connected' && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Déconnecter
            </button>
          )}
        </div>

        {/* QR Code */}
        {status === 'qr' && qrCode && (
          <div className="text-center">
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-2xl">
              <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-gray-700 font-medium">Comment se connecter :</p>
              <ol className="text-sm text-gray-500 space-y-1">
                <li>1. Ouvrez WhatsApp sur votre téléphone</li>
                <li>2. Allez dans Paramètres &gt; Appareils liés</li>
                <li>3. Appuyez sur "Lier un appareil"</li>
                <li>4. Scannez ce QR code</li>
              </ol>
            </div>
          </div>
        )}

        {/* Connected state */}
        {status === 'connected' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wifi className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-lg font-medium text-gray-900">Tout fonctionne !</p>
            <p className="text-gray-500 mt-1">Le bot répond automatiquement aux messages entrants.</p>
          </div>
        )}

        {/* Disconnected state */}
        {status === 'disconnected' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900">En attente de connexion</p>
            <p className="text-gray-500 mt-1">Le QR code apparaîtra automatiquement...</p>
            <button
              onClick={fetchStatus}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Connection;
