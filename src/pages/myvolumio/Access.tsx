/** MyVolumio access: the two doors, login or signup (social sign-in is off in the frame). */
import { useNavigate } from 'react-router-dom';
import { Fa, Glyph, MyvHead } from './parts';

export default function Access() {
  const nav = useNavigate();
  return (
    <div className="box">
      <MyvHead />
      <div className="boxHeader"><div className="title">
        <h2>MyVolumio</h2>
        <a href="https://volumio.com/volumio-premium-plan" target="_blank" rel="noreferrer" className="btn btn-outline pull-right" id="myvolumio-info"><Fa f="question" /> <span className="hidden-xs">What is MyVolumio?</span></a>
      </div></div>
      <div id="authLoginPlugin" className="panel panel-default">
        <div className="panel-heading"><h3 className="panel-title"><Fa f="user-circle-o" /> <span>Access</span></h3></div>
        <div className="panel-body">
          <div className="omb_login"><h3 className="omb_authTitle">Access</h3></div>
          <div className="row">
            <div className="col-xs-12 col-sm-9 col-sm-offset-3" style={{ marginBottom: 24 }}>
              <div className="well">
                <p className="lead">Already have an account?</p>
                <button onClick={() => nav('/myvolumio/login')} className="btn btn-success btn-block"><Glyph g="log-in" i /> <span>Login</span></button>
              </div>
            </div>
            <div className="col-xs-12 col-sm-9 ">
              <p className="lead "><span>Register now, it's free</span></p>
              <p><a onClick={() => nav('/myvolumio/signup')} className="btn btn-success btn-block "><Glyph g="user" i /> <span>Signup</span></a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
