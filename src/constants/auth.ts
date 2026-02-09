export const JWT_TOKEN_EXPIRY = "7d";
export const USERNAME_REGEX =
  /^(?!.*[@#$%^&*!`~])(?=^[a-zA-Z0-9])(?!.*[._-]$)[a-zA-Z0-9._-]{3,30}$/;
export const PASSWORD_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

export const USERNAME_LENGTH = {
  MIN: 3,
  MAX: 25,
};

export const PASSWORD_LENGTH = {
  MIN: 8,
  MAX: 12,
};
