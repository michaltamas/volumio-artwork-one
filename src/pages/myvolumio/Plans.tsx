/** MyVolumio plans (the theme's template): Monthly | Yearly segments, the plan cards. */
import { useEffect, useState } from 'react';
import { useAuth, showError } from '../../core/store/auth';
import { useProducts, MONTHLY_PLAN, YEARLY_PLAN, type Product } from '../../core/myvolumio/products';
import { BackButton, PlanCard, MyvHead } from './parts';

export default function Plans() {
  const user = useAuth(s => s.user);
  const [showYearly, setShowYearly] = useState(true);
  const [p, setP] = useState<{ p0?: Product; p1?: Product }>({});
  useEffect(() => { useProducts.getState().load().then(pr => setP({ p0: pr.free, p1: pr.premium })).catch(showError); }, []);
  useEffect(() => { if (user && user.planData && user.planDuration === 'monthly') { setShowYearly(false); } }, [user]);
  const showMode = { planDuration: showYearly ? YEARLY_PLAN : MONTHLY_PLAN };
  return (
    <div className="box">
      <MyvHead current="Plans" back="/myvolumio/profile" />
      <div id="authPlansPlugin" className="aw-plans">
        <BackButton to="/myvolumio/profile" label="Profile" />
        <div className="aw-plans__head">
          <h1 className="aw-plans__title">Plans</h1>
          <div className="aw-plans__seg" role="radiogroup">
            <button type="button" role="radio" aria-checked={!showYearly} className={!showYearly ? 'is-on' : ''} onClick={() => setShowYearly(false)}>Monthly</button>
            <button type="button" role="radio" aria-checked={showYearly} className={showYearly ? 'is-on' : ''} onClick={() => setShowYearly(true)}>Yearly</button>
          </div>
        </div>
        <div className="aw-plans__grid">
          {p.p0 ? <PlanCard product={p.p0} showMode={showMode} /> : null}
          {p.p1 ? <PlanCard product={p.p1} showMode={showMode} /> : null}
        </div>
      </div>
    </div>
  );
}
