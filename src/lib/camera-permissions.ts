/**
 * Camera permission helper for QR code scanning.
 * Handles permission request, error messages, and cleanup.
 */

export async function requestCameraPermission(): Promise<{ granted: boolean; error?: string }> {
  // Check if running in a secure context (HTTPS)
  if (!window.isSecureContext) {
    return { granted: false, error: 'O sistema precisa ser acessado via HTTPS para usar a câmera.' };
  }

  // Check if mediaDevices API is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { granted: false, error: 'Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari atualizado.' };
  }

  try {
    // Check current permission state if available
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'denied') {
          return { 
            granted: false, 
            error: 'Permissão da câmera foi negada. Vá nas configurações do navegador e permita o acesso à câmera para este site.' 
          };
        }
      } catch {
        // permissions.query may not support 'camera' in all browsers, continue
      }
    }

    // Explicitly request camera access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    // Stop the stream immediately - we just needed to trigger the permission
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { 
        granted: false, 
        error: 'Permissão da câmera negada. Toque no ícone de cadeado na barra de endereço e permita o acesso à câmera.' 
      };
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return { granted: false, error: 'Nenhuma câmera encontrada neste dispositivo.' };
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return { granted: false, error: 'A câmera está sendo usada por outro aplicativo. Feche outros apps e tente novamente.' };
    }
    if (err.name === 'OverconstrainedError') {
      // Try again without facingMode constraint
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return { granted: true };
      } catch {
        return { granted: false, error: 'Não foi possível acessar a câmera com as configurações solicitadas.' };
      }
    }
    return { granted: false, error: `Erro ao acessar câmera: ${err.message}` };
  }
}

export async function startQRScanner(
  elementId: string,
  onSuccess: (code: string) => void,
  onError: (error: string) => void
): Promise<{ scanner: any; stop: () => Promise<void> } | null> {
  const permission = await requestCameraPermission();
  if (!permission.granted) {
    onError(permission.error!);
    return null;
  }

  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode(elementId);

    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => {
        onSuccess(text);
        scanner.stop().catch(() => {});
      },
      () => {} // ignore scan failures
    );

    return {
      scanner,
      stop: async () => {
        try {
          await scanner.stop();
        } catch {
          // already stopped
        }
      },
    };
  } catch (err: any) {
    // Fallback: try without facingMode constraint
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(elementId);
      await scanner.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          onSuccess(text);
          scanner.stop().catch(() => {});
        },
        () => {}
      );
      return {
        scanner,
        stop: async () => { try { await scanner.stop(); } catch {} },
      };
    } catch {
      onError(`Não foi possível iniciar o scanner: ${err.message}`);
      return null;
    }
  }
}
