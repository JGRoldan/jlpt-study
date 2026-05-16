'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Algo salió mal</h2>
        <p className="text-muted-foreground">
          Ha ocurrido un error inesperado.
        </p>
        <Button onClick={() => reset()}>
          Intentar de nuevo
        </Button>
      </div>
    </div>
  );
}