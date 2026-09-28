/** MyVolumio profile (the frame's page, the theme's dress): avatar, name, email, one Edit (under the email), the plan card, the devices. */
import { useNavigate } from 'react-router-dom';
import { useAuth, showError } from '../../core/store/auth';
import Icon from '../../components/Icon';
import PageHead from '../../components/PageHead';
import { AvatarImage, CurrentPlanCard, DeviceSelector, Fa, Glyph } from './parts';

export default function Profile() {
  const user = useAuth(s => s.user); const nav = useNavigate();
  const logOut = () => { useAuth.getState().logOut().then(() => nav('/myvolumio/access')).catch(showError); };
  return (
    <div className="box">
      <PageHead variant="settings" nav={<nav className="aw-crumbs" aria-label="Breadcrumb"><span className="aw-crumbs__cur">MyVolumio</span></nav>}
        actions={user !== null ? <button type="button" className="aw-myv-logout" onClick={logOut}><Glyph g="log-out" /><span>Logout</span></button> : undefined} />
      <div className="boxHeader"><div className="title"><h2>MyVolumio</h2></div></div>
      {user !== null ? (
        <div>
          <div id="authLoginPlugin" className="panel panel-default">
            <div className="panel-heading">
              <button type="button" className="btn pull-right btn-danger btn-sm" onClick={logOut}><Glyph g="log-out" /><span className="hidden-sm">Logout</span></button>
              <h3 className="panel-title"><Fa f="user" /> <span>Profile</span></h3>
              <div style={{ clear: 'both' }}></div>
            </div>
            <div className="panel-body">
              <div>
                <div className="row my-profile">
                  <div className="col-sm-6 col-md-4"><AvatarImage /></div>
                  <div className="col-sm-18 col-md-20">
                    <div className="row">
                      <div className="col-sm-24 col-md-12 user-data">
                        <h3 className="user-title">{user.firstName} {user.lastName}</h3>
                        <h4 className="active user-username"> {user.username} </h4>
                        <p className="user-details"><i className="glyphicon glyphicon-envelope"><Icon name="mail" /></i> {user.email}<br /></p>
                        <button type="button" className="btn btn-default aw-myv-edit" onClick={() => nav('/myvolumio/profile/edit')}><Fa f="cog" /><span>Edit</span></button>
                        <p></p>{/* the frame's template nests a div in that paragraph: the parser leaves an empty one behind */}
                      </div>
                      <div className="col-sm-24 col-md-12 plans-table"><CurrentPlanCard action="upgrade" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div id="device-selector-container" className="panel panel-default">
            <div className="panel-heading"><h3 className="panel-title"><Fa f="check-circle-o" /> <span>Activate MyVolumio on devices</span></h3></div>
            <div className="panel-body"><DeviceSelector /></div>
          </div>
        </div>
      ) : (
        <div className="panel panel-default"><div className="panel-body">
          <h3>You're not logged. Please log-in or sign-up.</h3>
          <button className="btn btn-success" onClick={() => nav('/myvolumio/login')}>Login</button>
          <button className="btn btn-success" onClick={() => nav('/myvolumio/signup')}>Signup</button>
        </div></div>
      )}
    </div>
  );
}
