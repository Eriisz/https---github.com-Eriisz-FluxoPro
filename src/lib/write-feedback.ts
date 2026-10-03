type Notify = (message: { title: string; description: string; variant: 'destructive' }) => unknown;

export class WriteValidationError extends Error {}

/** Only allow success UI after the server confirms a write. Preserve inputs on failure. */
export async function confirmWrite(operation: Promise<unknown>, notify: Notify): Promise<boolean> {
  try {
    await operation;
    return true;
  } catch (error) {
    notify({ title: 'Não foi possível salvar', description: error instanceof WriteValidationError ? error.message : 'A operação não foi confirmada. Verifique sua conexão e permissões e tente novamente.', variant: 'destructive' });
    return false;
  }
}
