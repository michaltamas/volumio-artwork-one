/** The frame's "phone" question, as its media-query service asked it: a viewport up to 767px. */
import { useEffect, useState } from 'react';

export const PHONE_QUERY = '(max-width: 767px)';

export function usePhone(): boolean {
  const [phone, setPhone] = useState(() => { try { return window.matchMedia(PHONE_QUERY).matches; } catch { return false; } });
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}
