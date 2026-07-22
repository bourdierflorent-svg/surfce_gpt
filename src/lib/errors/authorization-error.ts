export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "The current role cannot perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}
