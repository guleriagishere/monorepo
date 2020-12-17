/**
 * Action types
 */

export const FETCH_GEODATA = "FETCH_GEODATA";
export const SUCCESS_FETCH_GEODATA = "SUCCESS_FETCH_GEODATA";
export const FAILED_FETCH_GEODATA = "FAILED_FETCH_GEODATA";

export const ADD_GEODATA = "ADD_GEODATA";
export const FAILED_ADD_GEODATA = "FAILED_ADD_GEODATA";
export const SUCCESS_ADD_GEODATA = "SUCCESS_ADD_GEODATA";
export const DELETE_ERROR = "DELETE_ERROR";

export const UPDATE_GEODATA = "UPDATE_GEODATA";
export const FAILED_UPDATE_GEODATA = "FAILED_UPDATE_GEODATA";
export const SUCCESS_UPDATE_GEODATA = "SUCCESS_UPDATE_GEODATA";

export const DELETE_GEODATA = "DELETE_GEODATA";
export const FAILED_DELETE_GEODATA = "FAILED_DELETE_GEODATA";
export const SUCCESS_DELETE_GEODATA = "SUCCESS_DELETE_GEODATA";

/**
 * Actions creator
 */

export const fetchGeodata = (data) => ({type: FETCH_GEODATA, data});
export const addGeodata = (data) => ({type: ADD_GEODATA, data});
export const deleteGeodata = (data) => ({type: DELETE_GEODATA, data});
export const updateGeodata = (data) => ({type: UPDATE_GEODATA, data});
export const deleteErorr = () => ({type: DELETE_ERROR});
/**
 * Reducers
 */

const initialState = {
  data: [],
  isFetching: false,
  error: ''
}

export default (state = initialState, action) => {
  switch(action.type) {
    case FETCH_GEODATA:
        return {
            ...state,
            isFetching: true
        }
    case SUCCESS_FETCH_GEODATA:
        return {
            ...state,
            isFetching: false,
            data: action.data
        }
    case FAILED_FETCH_GEODATA:
        return {
            ...state,
            isFetching: false,
            error: action.error
        }

    case ADD_GEODATA:
        return {
            ...state,
            isFetching: true
        }
    case FAILED_ADD_GEODATA:
        return {
            ...state,
            isFetching: false,
            error: action.error
        }
    case SUCCESS_ADD_GEODATA:
        var {data} = state;
        data.push(action.data);
        return {
            ...state,
            isFetching: false,
            data
        }
    case UPDATE_GEODATA:
        return {
            ...state,
            isFetching: true
        }
    case FAILED_UPDATE_GEODATA:
        return {
            ...state,
            isFetching: false,
            error: action.error
        }
    case SUCCESS_UPDATE_GEODATA:
        var {data} = state;
        data = data.map(record => {
            if (record._id === action.data._id)
                return action.data;
            else
                return record;
        });
        return {
            ...state,
            isFetching: false,
            data
        }

    case DELETE_GEODATA:
        return {
            ...state,
            isFetching: true
        }
    case FAILED_DELETE_GEODATA:
        return {
            ...state,
            isFetching: false,
            error: action.error
        }
    case SUCCESS_DELETE_GEODATA:
        var {data} = state;
        data = data.filter(record => record._id !== action.data._id);
        return {
            ...state,
            isFetching: false,
            data
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