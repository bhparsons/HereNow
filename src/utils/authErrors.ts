const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already associated with an account. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password. If you previously signed in with Google or Apple, try that method instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes.',
  'auth/user-disabled': 'This account has been disabled.',
};

export function getFriendlyAuthError(error: any): { message: string; field?: 'email' | 'password' } {
  const code = error?.code as string;
  const message = AUTH_ERROR_MESSAGES[code] || error?.message || 'Authentication failed. Please try again.';

  // Determine which field the error relates to
  let field: 'email' | 'password' | undefined;
  if (code === 'auth/invalid-email' || code === 'auth/email-already-in-use' || code === 'auth/user-not-found') {
    field = 'email';
  } else if (code === 'auth/wrong-password' || code === 'auth/weak-password' || code === 'auth/invalid-credential') {
    field = 'password';
  }

  return { message, field };
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password: string, isSignUp: boolean): string | null {
  if (!password) return 'Password is required.';
  if (isSignUp && password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}
