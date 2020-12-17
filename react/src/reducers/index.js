import { combineReducers } from 'redux';
import auth from './auth';
import ownerProductProperties from './ownerProductProperties';
import geodata from './geodata';

export default combineReducers({
  auth,
  ownerProductProperties,
  geodata
})
