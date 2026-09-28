/** MyVolumio's subscription flow: subscribe, change and cancel, payment success and fail. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, showError } from '../../core/store/auth';
import { useModal } from '../../core/store/modal';
import { useProducts, type Product } from '../../core/myvolumio/products';
import * as api from '../../core/myvolumio/api';
import { BackButton, CurrentPlanCard, Fa, PlanCard, MyvHead } from './parts';

function useProduct(code: string | undefined) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  useEffect(() => { let alive = true; useProducts.getState().byCode(code || '').then(p => { if (alive) { setProduct(p || null); } }).catch(e => { showError(e); if (alive) { setProduct(null); } }); return () => { alive = false; }; }, [code]);
  return product;
}
const paying = (title: string) => useModal.getState().open('myv-paying', { title });
const closePaying = () => { if (useModal.getState().name === 'myv-paying') { useModal.getState().close(); } };

export function Subscribe() {
  const { plan, planDuration } = useParams(); const nav = useNavigate();
  const user = useAuth(s => s.user); const product = useProduct(plan);
  return (
    <div className="box">
      <MyvHead trail={[['Plans', '/myvolumio/plans']]} current="Subscribe" back="/myvolumio/plans" />
      <div id="authLoginPlugin" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Subscribe</span></h3></div>
        <div className="panel-body">
          {user && product ? (
            <div>
              <BackButton to="/myvolumio/plans" label="Plans" />
              <h3>Complete plan upgrade</h3>
              <p>Complete the subscription by paying securely to get your account activated and unleash the full power of MyVolumio right now!</p>
              <PlanCard subscribe product={product} showMode={{ planDuration }} />
            </div>
          ) : null}
          {!user ? <div id=""><h4>You're not logged. Please log-in or sign-up.</h4><a onClick={() => nav('/myvolumio/login')} className="btn btn-lg btn-success">Login</a></div> : null}
          {product === null ? <div id=""><h4>Error. No subscribtion has been selected! Please select a subscription.</h4><a onClick={() => nav('/myvolumio/plans')} className="btn btn-lg btn-success">Retry</a></div> : null}
        </div>
      </div>
    </div>
  );
}

export function ChangeSubscription() {
  const { plan, planDuration } = useParams(); const nav = useNavigate();
  const user = useAuth(s => s.user); const product = useProduct(plan);
  const changePlan = async () => {
    if (!user || !product) { return; }
    if (!user.planData || user.planData.subscriptionId === undefined || user.planData.subscriptionId === null) { showError("Error, you don't have any plan yet"); return; }
    if (product.planCode === undefined) { showError('Please select a plan'); return; }
    if (!(await useModal.getState().confirm({ title: 'Change Plan', message: 'Do you really want to change your plan? You will be automatically charged with the new plan price difference' }))) { return; }
    paying('Payment in progress');
    const token = await useAuth.getState().getUserToken();
    const newPlanId = product.paddleId ? product.paddleId : (product.prices && product.prices[planDuration || ''] ? product.prices[planDuration || ''].paddleId : undefined);
    api.updateSubscription(token, user.uid, newPlanId, planDuration || '').then(res => {
      closePaying();
      if (res && res.success) { nav('/myvolumio/payment/success'); }
      else { showError((res && res.error && res.error.message) || 'Payment Failed'); nav('/myvolumio/payment/fail'); }
    }).catch(e => { closePaying(); showError((e && e.data && e.data.error && e.data.error.message) || 'Payment Failed'); nav('/myvolumio/payment/fail'); });
  };
  return (
    <div className="box" id="change-subscription">
      <MyvHead trail={[['Plans', '/myvolumio/plans']]} current="Change plan" back="/myvolumio/plans" />
      <div className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Change your plan</span></h3></div>
        <div className="panel-body">
          {user && product ? (
            <div>
              <BackButton to="/myvolumio/plans" label="Return to plans" />
              <h3 style={{ marginBottom: 16 }}>Switch your plan</h3>
              <h4 className="badged-block"><span>Current plan</span>: <span className="badge">{String(user.plan || '').toUpperCase()}</span></h4>
              <h4><span>You new plan will be</span>:</h4>
              <PlanCard product={product} showMode={{ planDuration }} changeSubscription changeSubscriptionCallback={changePlan} />
            </div>
          ) : null}
          {!user ? <div id=""><h4>You're not logged in. Please login to continue</h4><a onClick={() => nav('/myvolumio/login')} className="btn btn-lg btn-success">Login</a></div> : null}
          {product === null ? <div id=""><h4>Please select a plan</h4><a onClick={() => nav('/myvolumio/plans')} className="btn btn-lg btn-success">Retry</a></div> : null}
        </div>
      </div>
    </div>
  );
}

export function CancelSubscription() {
  const nav = useNavigate(); const user = useAuth(s => s.user); const product = useProduct('free');
  const downgrade = async () => {
    if (!user) { return; }
    if (!user.planData || !user.planData.subscriptionId) { showError('No Valid Subscription found'); return; }
    if (!(await useModal.getState().confirm({ title: 'Cancel Plan', message: 'Do you really want to cancel your plan? From now on, you will not be able to use MyVolumio Services.' }))) { return; }
    paying('Paying…');
    const token = await useAuth.getState().getUserToken();
    api.cancelSubscription(token, user.uid).then(res => { closePaying(); if (res && res.success) { nav('/myvolumio/payment/success'); } else { showError('Cancellation Failed'); } }).catch(() => { closePaying(); showError('Cancellation Failed'); });
  };
  return (
    <div className="box">
      <MyvHead trail={[['Plans', '/myvolumio/plans']]} current="Cancel subscription" back="/myvolumio/plans" />
      <div className="boxHeader"><div className="title"><h2>MyVolumio</h2></div></div>
      <div id="myvolumio-cancel-subscription" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Cancel Subscription</span></h3></div>
        <div className="panel-body">
          {user ? (
            <div>
              <BackButton to="/myvolumio/plans" label="Plans" />
              <h3 style={{ marginBottom: 16 }}>Cancel your current subscription</h3>
              <h4 className="badged-block"><span>Current plan</span>: <span className="badge"> {String(user.plan || '').toUpperCase()}</span></h4>
              <h4><span>You new plan will be</span>:</h4>
              {product ? <PlanCard product={product} cancellation cancellationCallback={downgrade} /> : null}
            </div>
          ) : <div id=""><h4>You're not logged in. Please login to continue</h4><a onClick={() => nav('/myvolumio/login')} className="btn btn-lg btn-success">Log In</a></div>}
        </div>
      </div>
    </div>
  );
}

export function PaymentSuccess() {
  return (
    <div className="box">
      <MyvHead current="Payment" back="/myvolumio/profile" />
      <div className="boxHeader"><div className="title"><h2>MyVolumio</h2></div></div>
      <div id="authLoginPlugin" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Payment successful</span></h3></div>
        <div className="panel-body">
          <h3>The payment has been successfull.</h3>
          <CurrentPlanCard action="profile" />
        </div>
      </div>
    </div>
  );
}

export function PaymentFail() {
  const nav = useNavigate();
  return (
    <div className="box">
      <MyvHead current="Payment" back="/myvolumio/plans" />
      <div className="boxHeader"><div className="title"><h2>MyVolumio</h2></div></div>
      <div id="authLoginPlugin" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Payment failed</span></h3></div>
        <div className="panel-body">
          <h4>We're sorry, but the payment has failed! Please check your card data and availability and try again. If the problem persist please contact the support.</h4>
          <br /><br />
          <a className="btn btn-success btn-lg" onClick={() => nav('/myvolumio/plans')}>Retry Payment</a>
        </div>
      </div>
    </div>
  );
}
