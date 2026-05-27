
import { useEffect, useState } from 'react';
import { runForgeos } from '@/lib/forgeos';
import { Toaster, toast } from 'sonner';

type ConnectionStatus = 'connecting' | 'ok' | 'error';

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const checkHealth = async () => {
      const result = await runForgeos(['health']);
      if (result.ok) {
        setStatus('ok');
        toast.success('Connected to ForgeOS');
      } else {
        setStatus('error');
        toast.error('Failed to connect to ForgeOS', {
          description: result.stderr || 'Unknown error',
        });
      }
    };

    checkHealth();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'ok':
        return 'bg-ok';
      case 'error':
        return 'bg-danger';
      default:
        return 'bg-warn';
    }
  };

  return (
    <>
      <Toaster position="top-right" theme="dark" />
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-dim">{status}</span>
      </div>
    </>
  );
}
