import React, {Component} from 'react';
import ReactDatatable from '@ashvin27/react-datatable';
import { connect } from 'react-redux'
import ReactLoading from 'react-loading'
import { fetchGeodata, addGeodata, updateGeodata, deleteGeodata, deleteErorr } from '../../reducers/geodata';
import AddGeoDataModal from './addGeodata';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

class GeoData extends Component {
  constructor(props) {
    super(props);
    this.columnInfos = [
      ['state',         'State'],
      ['state_abbr',    'State Abbr'],
      ['zipcode',       'Zipcode'],
      ['county',        'County'],
      ['city',          'City'],
      ['action',        'Action']
    ];
    
    this.columns = this.columnInfos.map((columnInfo, index) => {
        const key = columnInfo[0];
        const label = columnInfo[1];
        if (key === 'action') {
            const data = {
                key: "action",
                text: "Action",
                width: '150',
                sortable: true,
                cell: (record, index) => {
                    return (
                        <div style={{display: 'flex', justifyContent: 'center'}}>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={this.onClickEdit.bind(this, record, index)}
                                style={{marginRight: '5px'}}>
                                <span><i class="fa fa-pencil"></i></span>
                            </button>
                            <button 
                                className="btn btn-danger btn-sm" 
                                onClick={this.onClickDelete.bind(this, record, index)}>
                                    <span><i class="fa fa-trash-o"></i></span>
                            </button>
                        </div>
                    );
                }
            };
            return data;
        }
        else {
            const data = {
                key: key,
                text: label,
                align: "left",
                sortable: true,
            };
            return data;
        }
    });
        
    this.config = {
        page_size: 10,
        length_menu: [ 10, 15, 20, 50 ],
        show_pagination: true,
        show_filter: true,
        button: {
            excel: false,
            csv: true,
            print: false,
            extra: true,
        }
    };
    this.state = {
      selColumn: '',
      keyword: '',
      tags: [],
      openAddModal: false,
      openConfirmModal: false,
      state: '',
      state_abbr: '',
      zipcode: '',
      county: '',
      city: '',
      record: null,
      action: ''
    };
    this.extraButtons =[
        {
            className:"btn btn-warning btn-add-geodata",
            title:"Refresh",
            children:[
                <span><i class="fa fa-refresh"></i></span>
            ],
            onClick:(event)=>{
                if (this.props.isFetching) return;
                const {token} = this.props;
                this.props.fetchGeodata({token});
            },
        }, {
            className:"btn btn-primary btn-add-geodata",
            title:"Add New Geo-data",
            children:[
                <span>Add</span>
            ],
            onClick:(event)=>{
                if (this.props.isFetching) return;
                this.setState({
                    openAddModal: true,
                    state: '',
                    state_abbr: '',
                    zipcode: '',
                    county: '',
                    city: '',
                    action: 'add'
                });
            },
        }
    ];

    this.props.fetchGeodata({token: this.props.token});
  }

  componentWillReceiveProps = (nextProps) => {
    const  {isFetching} = this.props;
    const {openAddModal, openConfirmModal} = this.state;
    if (isFetching && !nextProps.isFetching) {
      if (nextProps.error) {
          this.props.deleteErorr();
      }
      else {
        if (openAddModal) {
            this.onCancel();
        }
        if (openConfirmModal) {
            this.onDismissConfirm();
        }
      }
    }
  }

  onCancel = () => {
    this.setState({openAddModal: false, action: ''});
  }

  onDismissConfirm = () => {
    this.setState({openConfirmModal: false, record: null, action: ''});
  }
  onSave = () => {
    const {state, state_abbr, zipcode, county, city} = this.state;
    const {token} = this.props;
    if (state && state_abbr && zipcode && county && city) {
        this.props.addGeodata({state, state_abbr, zipcode, county, city, token});
    }
  }

  onUpdate = () => {
    const {state, state_abbr, zipcode, county, city, record} = this.state;
    const {token} = this.props;
    if (state && state_abbr && zipcode && county && city) {
        this.props.updateGeodata({_id: record._id, state, state_abbr, zipcode, county, city, token});
    }
  }

  onClickEdit = (record, index) => {
    this.setState({
        openAddModal: true,
        state: record.state,
        state_abbr: record.state_abbr,
        zipcode: record.zipcode,
        county: record.county,
        city: record.city,
        action: 'edit',
        record
    });
  }

  onClickDelete = (record, index) => {
    this.setState({record, action: 'delete', openConfirmModal: true});
  }
 
  onConfirm = () => {
    const {record, action} = this.state;
    const {token} = this.props;

    if (action === 'delete')
        this.props.deleteGeodata({_id: record._id, token});
  }

  onChange = (data) => {
      this.setState({...data});
  }

  render() {
    const {data, isFetching} = this.props;
    const {openAddModal, openConfirmModal, state, state_abbr, zipcode, county, city, action} = this.state;
    return (
        <div className="home">
          { isFetching && <ReactLoading className="loading" type='bubbles' color='white' height={667} width={375} /> }
          <ReactDatatable
              config={this.config}
              records={data}
              columns={this.columns}
              loading={isFetching}
              extraButtons={this.extraButtons}
          />
          { openAddModal && 
            <AddGeoDataModal 
                onCancel={this.onCancel}
                onAction={action === "add" ? this.onSave : this.onUpdate}
                onChange={this.onChange}
                state={state}
                state_abbr={state_abbr}
                zipcode={zipcode}
                county={county}
                city={city}
                action={action}
            />
          }
          <Modal isOpen={openConfirmModal} toggle={this.onDismissConfirm}>
            <ModalHeader toggle={this.onDismissConfirm}>Confirm</ModalHeader>
            <ModalBody>
                Would you like to delete this geodata?
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={this.onDismissConfirm}>Cancel</Button>{' '}
                <Button color="primary" onClick={this.onConfirm}>Yes</Button>
            </ModalFooter>
          </Modal>
        </div>
    )
  }
}

const mapStateToPros = state => {
  return {
    isFetching: state.geodata.isFetching,
    data: state.geodata.data,
    token: state.auth.token,
    error: state.geodata.error
  }
}

const mapDispatchToPros = dispatch => {
    return {
        addGeodata: data => {
            dispatch(addGeodata(data));
        },
        fetchGeodata: data => {
            dispatch(fetchGeodata(data));
        },
        updateGeodata: data => {
            dispatch(updateGeodata(data));
        },
        deleteGeodata: data => {
            dispatch(deleteGeodata(data));
        },
        deleteErorr: () => {
            dispatch(deleteErorr());
        }
    }
}

export default connect(
  mapStateToPros,
  mapDispatchToPros
)(GeoData);
