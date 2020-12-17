import React, {Component} from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import PrivateRoute from './components/private-route';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import { connect } from 'react-redux'

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch> 
          <Route exact path='/' component={Login} />
          <Route exact path='/login' component={Login} />
          <PrivateRoute path='/dashboard' auth={this.props.token} component={Dashboard}/>
        </Switch>
      </BrowserRouter>
    )
  }
}

const mapStateToPros = state => {
  return {
    token: state.auth.token
  }
}

export default connect(
mapStateToPros
)(App);