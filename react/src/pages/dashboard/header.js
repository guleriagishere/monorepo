import React, {Component} from 'react';
import { Button, Input } from 'reactstrap';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import 'bootstrap-daterangepicker/daterangepicker.css';
import { connect } from 'react-redux'
import {fetchOwnerProductProperties, updateDateRange, updatePracticeType} from '../../reducers/ownerProductProperties';
import {deleteToken} from '../../reducers/auth';
import moment from 'moment';
import { Link } from 'react-router-dom';

class Logo extends Component {
  render () {
    return (
      <Link to="/dashboard">
        <img className="logo" src="/logo.png" alt="logo"/>
      </Link>
    );
  }
}
class Header extends Component {
  constructor() {
    super();
    props:{

    }
  }

  onDateRangeCallback = (start, end, label) => {
    const {token,filterData, practiceType} = this.props;
    const startDate = start.format('MM/DD/yyyy');
    const endDate = end.format('MM/DD/yyyy')
    this.props.updateDateRange({startDate, endDate});
    this.props.fetchOwnerProductProperties({token, from: startDate, to: endDate,currentPage:1,perPage:20,practiceType,filters:JSON.stringify(filterData)});
  }

  onFetchData = () => {
    const {token, startDate, endDate, isFetching,filterData, practiceType} = this.props;
    if (isFetching) return;
    this.props.fetchOwnerProductProperties({token, from: startDate, to: endDate,currentPage:0,perPage:20,practiceType,filters:JSON.stringify(filterData)});
  }

  onExport= () => {
    const {token, startDate, endDate, isFetching,filterData} = this.props;
    const endpoint = process.env.REACT_APP_NODE_ENV === 'development' ?
      process.env.REACT_APP_EXPORT_API_DEV : process.env.REACT_APP_EXPORT_API_PROD;  
    const url =`${endpoint}?token=${token}&from=${startDate}&to=${endDate}&filters=${JSON.stringify(filterData)}`;
    const encoded = encodeURI(url);
    console.log(encoded)
    window.open(url, "_blank");
  }
  
  onLogout = () => {
    this.props.deleteToken();
    window.location.href = '/';
  }

  onChangePracticeType = (e) => {
    const {token, startDate, endDate, isFetching,filterData} = this.props;
    this.props.updatePracticeType({practiceType: e.target.value});
    this.props.fetchOwnerProductProperties({token, from: startDate, to: endDate,currentPage:0,perPage:20,practiceType: e.target.value,filters:JSON.stringify(filterData)});
  }

  render() {
    const {startDate, endDate, practiceType, isFetching} = this.props;
    const isGeoData = this.props.location.pathname === '/dashboard/geo-data';

    return (
      <header className="Header">
        <Logo />
        <div className="control-items">
          { !isGeoData && <div className="control-items">
            <Link to="/dashboard/geo-data">
            <img className="geo-data" src="/geodata-logo.png" alt="geo-data" />
            </Link>
            <Input type="select" 
              name="select" 
              id="practiceTypeSelect"
              value={practiceType}
              onChange={this.onChangePracticeType}
            >
              <option value="all">All</option>
              <option value="preforeclosure">Preforeclosure</option>
              <option value="bankruptcy">Bankruptcy</option>
              <option value="tax-lien">Tax-lien</option>
              <option value="auction">Auction</option>
              <option value="inheritance">Inheritance</option>
              <option value="probate">Probate</option>
              <option value="eviction">Eviction</option>
              <option value="hoa-lien">Hoa-lien</option>
              <option value="irs-lien">Irs-lien</option>
              <option value="mortgage-lien">Mortgage-lien</option>
              <option value="pre-inheritance">Pre-inheritance</option>
              <option value="pre-probate">Pre-probate</option>
              <option value="divorce">Divorce</option>
              <option value="tax-delinquency">Tax-delinquency</option>
              <option value="code-violation">Code-violation</option>
              <option value="absentee-property-owner">Absentee-property-owner</option>
              <option value="vacancy">Vacancy</option>
              <option value="other-civil">Other Civil</option>
            </Input>
            <DateRangePicker
              initialSettings={{
                startDate,
                endDate,
                ranges: {
                  Today: [moment().toDate(), moment().toDate()],
                  Yesterday: [
                    moment().subtract(1, 'days').toDate(),
                    moment().subtract(1, 'days').toDate(),
                  ],
                  'Last 7 Days': [
                    moment().subtract(6, 'days').toDate(),
                    moment().toDate(),
                  ],
                  'Last 30 Days': [
                    moment().subtract(29, 'days').toDate(),
                    moment().toDate(),
                  ],
                  'This Month': [
                    moment().startOf('month').toDate(),
                    moment().endOf('month').toDate(),
                  ],
                  'Last Month': [
                    moment().subtract(1, 'month').startOf('month').toDate(),
                    moment().subtract(1, 'month').endOf('month').toDate(),
                  ],
                },
              }}
              onCallback={this.onDateRangeCallback}
            >
              <input type="text" className="form-control" style={{width: '250px', margin: '0px 10px'}}/>
            </DateRangePicker>
            <Button color="primary" onClick={this.onFetchData}>{isFetching ? "Fetching now..." : "Fetch Data"}</Button>
            <Button color="primary" onClick={this.onExport}>Export</Button>
          </div> }
          <Button color="danger" onClick={this.onLogout}>Logout</Button>
        </div>
      </header>  
    )
  }
}

const mapStateToPros = state => {
  return {
    isFetching: state.ownerProductProperties.isFetching,
    startDate: state.ownerProductProperties.startDate,
    endDate: state.ownerProductProperties.endDate,
    token: state.auth.token,
    practiceType: state.ownerProductProperties.practiceType,
    filterData:state.ownerProductProperties.filterData
  }
}
const mapDispatchToPros = dispatch => {
  return {
    fetchOwnerProductProperties: data => {
      dispatch(fetchOwnerProductProperties(data));
    },
    updateDateRange: data => {
      dispatch(updateDateRange(data));
    },
    deleteToken: () => {
      dispatch(deleteToken());
    },
    updatePracticeType: data => {
      dispatch(updatePracticeType(data));
    }
  }
}

export default connect(
  mapStateToPros, 
  mapDispatchToPros
)(Header)
