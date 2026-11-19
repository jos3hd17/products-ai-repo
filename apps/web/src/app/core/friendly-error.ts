import { HttpErrorResponse } from '@angular/common/http';
export function friendlyError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse))
    return 'No pudimos completar la operación. Intenta de nuevo.';
  switch (error.status) {
    case 0:
      return 'No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.';
    case 400:
      return 'Revisa los datos ingresados e intenta de nuevo.';
    case 401:
      return 'Tu sesión terminó o las credenciales no son correctas.';
    case 403:
      return 'No tienes permiso para esta operación. Verifica la dirección de acceso.';
    case 404:
      return 'Este producto ya no está disponible. Actualiza la lista.';
    case 409:
      return 'Los datos entraron en conflicto con otro cambio. Actualiza e intenta de nuevo.';
    case 429:
      return 'Hay demasiados intentos. Espera un momento antes de continuar.';
    default:
      return 'El servidor no pudo completar la operación. Intenta más tarde.';
  }
}
