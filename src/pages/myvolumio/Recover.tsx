/** MyVolumio password recovery. */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, showError } from '../../core/store/auth';
import { BackButton, Fa, Glyph, MyvHead } from './parts';

export default function Recover() {
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  const recover = (e: FormEvent) => { e.preventDefault(); if (email) { useAuth.getState().recoverPassword(email).then(() => setSent(true)).catch(showError); } };
  return (
    <div className="box">
      <MyvHead trail={[["Login", "/myvolumio/login"]]} current="Recover password" back="/myvolumio/login" />
      <div className="boxHeader"><div className="title"><h2>MyVolumio</h2></div></div>
      <div id="authLoginPlugin" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Recover password</span></h3></div>
        <div className="panel-body">
          <BackButton to="/myvolumio/login" label="Login" />
          <p>Please fill the form to recover your password</p>
          <div className="container"><div className="row"><div className="col-md-8 col-md-offset-8">
            <div className="panel panel-default"><div className="panel-body"><div className="text-center">
              <h3><Fa f="lock" className="fa-4x" /></h3>
              <h2 className="text-center">Forgot Password?</h2>
              <p>You can reset your password here.</p>
              {!sent ? (
                <div className="panel-body">
                  <form id="register-form" role="form" autoComplete="off" className="form" onSubmit={recover}>
                    <div className="form-group"><div className="input-group">
                      <span className="input-group-addon"><Glyph g="envelope" i /></span>
                      <input value={email} onChange={e => setEmail(e.target.value)} id="email" name="email" placeholder="email address" className="form-control" type="email" />
                    </div></div>
                    <div className="form-group"><input name="recover-submit" className="btn btn-lg btn-success btn-block" value="Reset password" type="submit" /></div>
                    <input type="hidden" className="hide" name="token" id="token" value="" readOnly />
                  </form>
                </div>
              ) : (
                <div>
                  <h3>We just sent instructions on how to reset your password to your mail, check it out</h3>
                  <a className="btn btn-success btn-block btn-lg" onClick={() => nav('/myvolumio/login')}>Done? Go to login</a>
                </div>
              )}
            </div></div></div>
          </div></div></div>
        </div>
      </div>
    </div>
  );
}
