import React from 'react';
import { Route, Redirect } from 'react-router-dom';

const PrivateRoute = ({component: Component, auth, ...rest}) => {
    return (
        // Show the component only when the user is logged in
        // Otherwise, redirect the user to /signin page
        <Route {...rest} render={props => (
            (auth || localStorage.getItem('homesalesclub_token')) ? <Component {...props}/>
            : <Redirect to="/login" />
        )} />
    );
};

export default PrivateRoute;