/**
 * Action types
 */

export const AUTH_LOGIN = 'AUTH_LOGIN';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILED = 'LOGIN_FAILED';
export const DELETE_TOKEN = 'DELETE_TOKEN';
export const DELETE_ERROR = 'DELETE_ERROR';

/**
 * Actions creator
 */

export const login = data => ({type: AUTH_LOGIN, data});
export const loginSuccess = (data) => ({type: LOGIN_SUCCESS, data});
export const loginFailed = (data) => ({type: LOGIN_FAILED, data});
export const deleteToken = () => ({type: DELETE_TOKEN});
export const deleteError = () => ({type: DELETE_ERROR});

/**
 * Reducers
 */

const initialState = {
  token: localStorage.getItem('homesalesclub_token', ''),
  isLoggingin: false,
  error: ''
};

export default (state = initialState, action) => {
  switch(action.type) {
    case AUTH_LOGIN:
        return {
            ...state,
            token: '',
            isLoggingin: true
        };
    case LOGIN_SUCCESS:
        localStorage.setItem('homesalesclub_token', action.data.signin.token);
        return {
            ...state,
            token: action.data.signin.token,
            error: action.data.signin.error,
            isLoggingin: false
        };
    case LOGIN_FAILED:
        return {
            ...state,
            isLoggingin: false,
            error: action.data.signin.error
        }
    case DELETE_TOKEN:
        localStorage.removeItem('homesalesclub_token');
        return {
            ...state,
            token: '',
            error: ''
        }
    case DELETE_ERROR:
        return {
            ...state,
            error: ''
        }
    default:
      return state
  }
}