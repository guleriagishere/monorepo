import ApolloClient from 'apollo-client'
import gql from 'graphql-tag'
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';


/**
  The API wraps an Apollo client, which provides query/mutation execution
  as well as fragment caching.
*/

const GRAPHQL_ENDPOINT = process.env.REACT_APP_NODE_ENV === 'development' ?
  process.env.REACT_APP_GRAPHQL_ENDPOINT_DEV : process.env.REACT_APP_GRAPHQL_ENDPOINT_PROD;

export const apolloClient = new ApolloClient({
    link: createHttpLink({ uri: GRAPHQL_ENDPOINT }),
    cache: new InMemoryCache(),
});

export const fetchOwnerProductProperties = (data) => apolloClient.query({
  query: gql`
    query FetchOwnerProductProperties($token: String!, $from: String!, $to: String!,$perPage: Int,$currentPage: Int, $practiceType: String, $filters:String) {
        fetchOwnerProductProperties(token: $token, from: $from, to: $to,currentPage:$currentPage,perPage:$perPage,practiceType:$practiceType,filters:$filters) {
            success
            data
            count
            error
        }
    }
  `,
  variables: {
    practiceType:data.practiceType,
    filters:data.filters,
    token: data.token,
    from: data.from,
    to: data.to,
    perPage:data.perPage,
    currentPage:data.currentPage
  }
});

export const signin = function (data) {
  return apolloClient.query({
    query: gql`
    query Signin($email: String!, $password: String!) {
        signin(email: $email, password: $password) {
            success
            token
            error
        }
    }
  `,
    variables: {
      email: data.email,
      password: data.password
    }
  })
};

export const fetchGeodata = (data) => apolloClient.query({
  query: gql`
    query FetchGeodatas($token: String!) {
        geodatas(token: $token) {
            success
            data {
                state
                state_abbr
                county
                city
                zipcode
                _id
            }
            error
        }
    }
  `,
  variables: {
    token: data.token
  }
});

export const addGeodata = (data) => apolloClient.mutate({
  mutation: gql`
    mutation addGeodata($state: String!, $state_abbr: String!, $zipcode: String!, $county: String!, $city: String!, $token: String!) {
        addGeodata(state: $state, state_abbr: $state_abbr, zipcode: $zipcode, county: $county, city: $city, token: $token) {
            success
            data {
              state
              state_abbr
              county
              city
              zipcode
              _id
            }
            error
        }
    }
  `,
  variables: {
    state: data.state,
    state_abbr: data.state_abbr,
    zipcode: data.zipcode,
    county: data.county,
    city: data.city,
    token: data.token
  }
});

export const updateGeodata = (data) => apolloClient.mutate({
  mutation: gql`
    mutation updateGeodata($id: String!, $state: String!, $state_abbr: String!, $zipcode: String!, $county: String!, $city: String!, $token: String!) {
      updateGeodata(id: $id, state: $state, state_abbr: $state_abbr, zipcode: $zipcode, county: $county, city: $city, token: $token) {
            success
            data {
              state
              state_abbr
              county
              city
              zipcode
              _id
            }
            error
        }
    }
  `,
  variables: {
    id: data._id,
    state: data.state,
    state_abbr: data.state_abbr,
    zipcode: data.zipcode,
    county: data.county,
    city: data.city,
    token: data.token
  }
});

export const deleteGeodata = (data) => apolloClient.mutate({
  mutation: gql`
    mutation deleteGeodata($id: String!, $token: String!) {
      deleteGeodata(id: $id, token: $token) {
            success           
            data {
              _id
            }
            error
        }
    }
  `,
  variables: {
    id: data._id,
    token: data.token
  }
});
