import { takeEvery, call, put } from 'redux-saga/effects'
import { FETCH_PUBLIC_RECORD_LINE_ITEMS, RECEIVE_PUBLIC_RECORD_LINE_ITEMS } from '../reducers/ownerProductProperties';
import {
  FETCH_GEODATA, ADD_GEODATA, SUCCESS_FETCH_GEODATA, FAILED_FETCH_GEODATA, SUCCESS_ADD_GEODATA, FAILED_ADD_GEODATA,
  UPDATE_GEODATA, SUCCESS_UPDATE_GEODATA, FAILED_UPDATE_GEODATA, DELETE_GEODATA, SUCCESS_DELETE_GEODATA, FAILED_DELETE_GEODATA
} from '../reducers/geodata';
import { AUTH_LOGIN, LOGIN_SUCCESS, LOGIN_FAILED, DELETE_TOKEN } from '../reducers/auth'
import * as api from '../api/apollo_proxy';

function* takeLogin() {
  yield takeEvery(AUTH_LOGIN, function* (action) {
    try {
      const {data} = yield call(api['signin'], action.data);
      if (data.signin.success)
        yield put({type: LOGIN_SUCCESS, data});
      else
        yield put({type: LOGIN_FAILED, data});        
    } catch (error) {
      console.log(error);
      yield put({type: LOGIN_FAILED, data:{signin: {error: error.message}}});
    }
  });
}

function* takeOwnerProductProperties() {
  yield takeEvery(FETCH_PUBLIC_RECORD_LINE_ITEMS, function* (action) {
    try {
      const {data} = yield call(api['fetchOwnerProductProperties'], action.data);
      if (data.fetchOwnerProductProperties.success) {
        yield put({type: RECEIVE_PUBLIC_RECORD_LINE_ITEMS, data: JSON.parse(data.fetchOwnerProductProperties.data),count:data.fetchOwnerProductProperties.count});
      }
    } catch (error) {
      alert(error.message);
      yield put({type: DELETE_TOKEN});
      window.location.href = '/';
    }    
  });
}

function* takeFetchGeodata() {
  yield takeEvery(FETCH_GEODATA, function* (action) {
    try {
      console.log(action.data)
      const {data} = yield call(api['fetchGeodata'], action.data);
      if (data.geodatas.success) {
        yield put({type: SUCCESS_FETCH_GEODATA, data: data.geodatas.data});
      }
      else {
        yield put({type: FAILED_FETCH_GEODATA, error: data.geodatas.error});
      }
    } catch (error) {
      alert(error.message);
      yield put({type: FAILED_FETCH_GEODATA, error: error.message});
    }    
  });
}

function* takeAddGeodata() {
  yield takeEvery(ADD_GEODATA, function* (action) {
    try {
      const {data} = yield call(api['addGeodata'], action.data);
      if (data.addGeodata.success) {
        yield put({type: SUCCESS_ADD_GEODATA, data: data.addGeodata.data});
      }
    } catch (error) {
      alert(error.message);
      yield put({type: FAILED_ADD_GEODATA, error: error.message});
    }    
  });
}

function* takeUpdateGeodata() {
  yield takeEvery(UPDATE_GEODATA, function* (action) {
    try {
      const {data} = yield call(api['updateGeodata'], action.data);
      if (data.updateGeodata.success) {
        yield put({type: SUCCESS_UPDATE_GEODATA, data: data.updateGeodata.data});
      }
    } catch (error) {
      alert(error.message);
      yield put({type: FAILED_UPDATE_GEODATA, error: error.message});
    }    
  });
}

function* takeDeleteGeodata() {
  yield takeEvery(DELETE_GEODATA, function* (action) {
    try {
      const {data} = yield call(api['deleteGeodata'], action.data);
      if (data.deleteGeodata.success) {
        yield put({type: SUCCESS_DELETE_GEODATA, data: data.deleteGeodata.data});
      }
    } catch (error) {
      alert(error.message);
      yield put({type: FAILED_DELETE_GEODATA, error: error.message});
    }    
  });
}

export default function* rootSaga() {
  yield [
    takeLogin(),
    takeOwnerProductProperties(),
    takeFetchGeodata(),
    takeAddGeodata(),
    takeUpdateGeodata(),
    takeDeleteGeodata()
  ];
}