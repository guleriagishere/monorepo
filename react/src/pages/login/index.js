import React, {Component} from 'react';
import {
  Container, Form,
  FormGroup, Label, Input,
  Button, FormFeedback
} from 'reactstrap';
import { connect } from 'react-redux'
import {login, deleteError} from '../../reducers/auth';

class Login extends Component {
  state = {
    email: '',
    password: '',
    emailValid: false,
    passwordValid: false
  }

  componentWillReceiveProps = (nextProps) => {
    if (!nextProps.isLoggingin && nextProps.token) {
      this.props.history.push('/dashboard');
    }
  }

  onClickLogin = (e) => {
    const {isLoggingin} = this.props;
    const {email, password, emailValid, passwordValid} = this.state;
    if (isLoggingin) return;
    if (!emailValid || !passwordValid) return;
    this.props.deleteError();
    this.props.login({email, password});
  }

  onChangeEmail = (e) => {
    const {isLoggingin} = this.props;
    if (isLoggingin) return;
    const email = e.target.value;
    const emailValid = email.match(/^([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,5})$/g) ? true : false;
    this.setState({email, emailValid});
  }

  onChangePassword = (e) => {
    const {isLoggingin} = this.props;
    if (isLoggingin) return;
    const password = e.target.value;
    const passwordValid = password.length > 0;
    this.setState({password, passwordValid});
  }

  render () {
    const {email, password, emailValid, passwordValid} = this.state;
    const {isLoggingin, error} = this.props;
    return (
      <layout>
        <Container className="login-container">
          <h1 style={{textAlign: 'center'}}>HOME SALES CLUB</h1>
          <br />
          <p style={{textAlign: 'center', fontSize: '30px'}}>Sign In</p>
          {error && <p style={{textAlign: 'center', color: 'red'}}>{error}</p>}
          <Form className="form">
              <FormGroup>
                <Label>Email</Label>
                <Input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="myemail@email.com"
                  value={email}
                  onChange={this.onChangeEmail}
                  valid={emailValid}
                  invalid={!emailValid}
                />
                <FormFeedback>Email should be valid one!</FormFeedback>
              </FormGroup>
              <FormGroup>
                <Label for="password">Password</Label>
                <Input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="********"
                  value={password}
                  onChange={this.onChangePassword}
                  valid={passwordValid}
                  invalid={!passwordValid}
                />
                <FormFeedback>Password should be not empty!</FormFeedback>
              </FormGroup>
            <br />
            <Button color="info" size="lg" block onClick={this.onClickLogin}>{isLoggingin ? "Please wait..." : "Login"}</Button>
          </Form>
        </Container>
      </layout>
    )
  }
}

const mapStateToPros = state => {
  return {
    isLoggingin: state.auth.isLoggingin,
    token: state.auth.token,
    error: state.auth.error
  };
}
const mapDispatchToPros = dispatch => {
  return {
    login: data => {
      dispatch(login(data))
    },
    deleteError: _ => {
      dispatch(deleteError())
    }
  };
}

export default connect(
  mapStateToPros, 
  mapDispatchToPros
)(Login);