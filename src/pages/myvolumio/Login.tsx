/** MyVolumio login: email and password, the recovery link, signup pill. */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, showError } from '../../core/store/auth';
import { AlreadyLogged, Fa, MyvHead } from './parts';

export default function Login() {
  const nav = useNavigate(); const user = useAuth(s => s.user);
  const [username, setUsername] = useState(''); const [pass, setPass] = useState('');
  const login = (e: FormEvent) => { e.preventDefault(); useAuth.getState().login(username, pass).then(() => nav('/myvolumio/profile'), showError); };
  return (
    <div className="box">
      <MyvHead current="Login" back="/myvolumio/access" />
      <div className="boxHeader"><div className="title">
        <h2>MyVolumio</h2>
        <a href="https://volumio.com/volumio-premium-plan" target="_blank" rel="noreferrer" className="btn btn-outline pull-right" id="myvolumio-info"><Fa f="question" /> <span className="hidden-xs">What is MyVolumio?</span></a>
      </div></div>
      <div id="authLoginPlugin" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Login</span></h3></div>
        <div className="panel-body">
          {user == null ? (
            <div id="">
              <div className="omb_login">
                <a onClick={() => nav('/myvolumio/signup')} className="btn btn-outline pull-right"><Fa f="user" /> <span>Signup</span></a>
                <h3 className="omb_authTitle">Login</h3>
                <div style={{ clear: 'both' }}></div>
                <div className="row omb_row-sm-offset-3">
                  <div className="col-xs-24 col-sm-12">
                    <form onSubmit={login}>
                      <div className="omb_loginForm">
                        <div className="input-group">
                          <span className="input-group-addon"><Fa f="user" /></span>
                          <input type="email" className="form-control" required placeholder="Email Address" value={username} onChange={e => setUsername(e.target.value)} />
                        </div>
                        <span className="help-block"></span>
                        <div className="input-group">
                          <span className="input-group-addon"><Fa f="lock" /></span>
                          <input type="password" className="form-control" required placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} pattern=".{8,}" />
                        </div>
                        <span className="help-block">&nbsp;</span>
                        <input type="submit" className="btn btn-lg btn-success btn-block" value="Login" />
                      </div>
                    </form>
                  </div>
                </div>
                <div className="row omb_row-sm-offset-3">
                  <div className="col-xs-24 col-sm-6"><label className="checkbox hidden"><input type="checkbox" value="remember-me" /><span>Remember me</span></label></div>
                  <div className="col-xs-24 col-sm-6"><p className="omb_forgotPwd"><a onClick={() => nav('/myvolumio/recover-password')} style={{ cursor: 'pointer' }}>Forgot password</a></p></div>
                </div>
              </div>
            </div>
          ) : <div><AlreadyLogged /></div>}
        </div>
      </div>
    </div>
  );
}
