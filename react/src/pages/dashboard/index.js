import React from 'react';
import {Route, Switch} from 'react-router-dom';
import Home from '../home';
import Header from './header';
import GeoData from '../geodata';
import RSC from "react-scrollbars-custom";

const Dashboard = (props) => (
  <layout>
    <Header {...props}/>
    <div className="content">
      <RSC>
        <Switch>
          <Route exact path={`${props.match.url}/`} component={Home} />
          <Route exact path={`${props.match.url}/geo-data`} component={GeoData} />
        </Switch>
      </RSC>
    </div>
  </layout>
)

export default Dashboard;
