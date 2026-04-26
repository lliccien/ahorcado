import ConnectionBanner from './ConnectionBanner';
import ToastStack from './ToastStack';

/**
 * Pequeño wrapper para montar los overlays globales (banner de conexión y
 * toasts) como un único island. Se inserta en cada página que usa websocket.
 */
export default function Overlays() {
  return (
    <>
      <ConnectionBanner />
      <ToastStack />
    </>
  );
}
