/**
 * MyVolumio's states under /myvolumio (the frame's child states with their guards). The bare
 * /myvolumio is abstract there and lands on playback; every child needs the account enabled.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { Guard } from './parts';
import Profile from './Profile';
import Access from './Access';
import Login from './Login';
import Recover from './Recover';
import Signup from './Signup';
import EditProfile from './EditProfile';
import Plans from './Plans';
import { Subscribe, ChangeSubscription, CancelSubscription, PaymentSuccess, PaymentFail } from './Subscription';

// the state's name for the wrapper's aw-state- class
export function myVolumioState(pathname: string): string {
  const p = pathname.replace(/^\/myvolumio\/?/, '');
  if (p === 'profile/edit') { return 'edit-profile'; }
  if (p.indexOf('subscription/change') === 0) { return 'change-subscription'; }
  if (p === 'subscription/cancel') { return 'cancel-subscription'; }
  if (p === 'payment/success') { return 'payment-success'; }
  if (p === 'payment/fail') { return 'payment-fail'; }
  if (p.indexOf('subscribe/') === 0) { return 'subscribe'; }
  if (p === 'profile/verify') { return 'verify-user'; }
  return p.split('/')[0] || '';
}

export default function MyVolumio() {
  return (
    <Routes>
      <Route index element={<Navigate to="/playback" replace />} />
      <Route path="profile" element={<Guard need="user" verified><Profile /></Guard>} />
      <Route path="profile/edit" element={<Guard need="user"><EditProfile /></Guard>} />
      <Route path="access" element={<Guard need="null"><Access /></Guard>} />
      <Route path="login" element={<Guard need="null"><Login /></Guard>} />
      <Route path="signup" element={<Guard need="none"><Signup /></Guard>} />
      <Route path="recover-password" element={<Guard need="none"><Recover /></Guard>} />
      <Route path="plans" element={<Guard need="user" verified><Plans /></Guard>} />
      <Route path="subscribe/:plan/:planDuration" element={<Guard need="user" verified><Subscribe /></Guard>} />
      <Route path="subscription/change/:plan/:planDuration" element={<Guard need="user" verified><ChangeSubscription /></Guard>} />
      <Route path="subscription/cancel" element={<Guard need="user" verified><CancelSubscription /></Guard>} />
      <Route path="payment/success" element={<Guard need="user" verified><PaymentSuccess /></Guard>} />
      <Route path="payment/fail" element={<Guard need="user" verified><PaymentFail /></Guard>} />
      <Route path="*" element={<Navigate to="/browse" replace />} />
    </Routes>
  );
}
