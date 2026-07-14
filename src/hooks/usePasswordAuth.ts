import { useState } from 'react';
import { signInWithPassword, signUpWithPassword } from '../services/backend';

/**
 * E-mail + password form state shared by the Login screen and the Settings
 * account section. Successful sign-in surfaces via the store's authUser
 * (set by onAuthStateChange), not through this hook.
 */
export function usePasswordAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'idle' | 'signin' | 'signup'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const ready = email.includes('@') && password.length >= 6;

  const signIn = async () => {
    setError(null);
    setInfo(null);
    setBusy('signin');
    const result = await signInWithPassword(email.trim(), password);
    if (result.error) setError(result.error);
    else setPassword('');
    setBusy('idle');
  };

  const signUp = async () => {
    setError(null);
    setInfo(null);
    setBusy('signup');
    const result = await signUpWithPassword(email.trim(), password);
    if (result.error) {
      setError(result.error);
    } else if (result.needsConfirmation) {
      setInfo('Account created — confirm it via the link in your e-mail, then sign in here.');
    } else {
      setPassword('');
    }
    setBusy('idle');
  };

  return { email, setEmail, password, setPassword, busy, error, info, ready, signIn, signUp };
}
