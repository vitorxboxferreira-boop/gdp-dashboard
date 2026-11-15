/** Erro temporário: a tarefa volta para a fila com backoff. */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

/** Erro definitivo: a tarefa é marcada como "dead" sem novas tentativas. */
export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

/** Automação pausada (parada de emergência). */
export class PausedError extends PermanentError {
  constructor() {
    super("Automações pausadas pela parada de emergência");
    this.name = "PausedError";
  }
}

/** Reagendar a tarefa sem consumir tentativa (ex.: fora do horário de atendimento). */
export class DeferError extends Error {
  constructor(readonly seconds: number, message: string) {
    super(message);
    this.name = "DeferError";
  }
}
