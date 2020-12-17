import React, {Component} from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { Col, Form, FormGroup, Label, Input } from 'reactstrap';

class AddGeoDataModal extends Component {
    onChange = (e) => {
        const {onChange} = this.props;
        onChange({[e.target.name]: e.target.value});
    }
    render() {
        const {onCancel, onAction, state, state_abbr, zipcode, county, city, action} = this.props;
        return (
            <div>
                <Modal isOpen={true} className="add-geodata-modal">
                    <ModalHeader>Add New Geo-Data</ModalHeader>
                    <ModalBody>
                        <Form>
                            <FormGroup row>
                                <Label for="state" sm={3}>State</Label>
                                <Col sm={9}>
                                    <Input type="text" name="state" id="state" placeholder="State" value={state} onChange={this.onChange}/>
                                </Col>
                            </FormGroup>
                            <FormGroup row>
                                <Label for="state_abbr" sm={3}>State Abbr</Label>
                                <Col sm={9}>
                                    <Input type="text" name="state_abbr" id="state_abbr" placeholder="State Abbr" value={state_abbr} onChange={this.onChange} />
                                </Col>
                            </FormGroup>
                            <FormGroup row>
                                <Label for="zipcode" sm={3}>Zipcode</Label>
                                <Col sm={9}>
                                    <Input type="text" name="zipcode" id="zipcode" placeholder="Zipcode" value={zipcode} onChange={this.onChange} />
                                </Col>
                            </FormGroup>
                            <FormGroup row>
                                <Label for="county" sm={3}>County</Label>
                                <Col sm={9}>
                                    <Input type="text" name="county" id="county" placeholder="County" value={county} onChange={this.onChange} />
                                </Col>
                            </FormGroup>
                            <FormGroup row>
                                <Label for="city" sm={3}>City</Label>
                                <Col sm={9}>
                                    <Input type="text" name="city" id="city" placeholder="City" value={city} onChange={this.onChange} />
                                </Col>
                            </FormGroup>
                        </Form>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={onCancel}>Cancel</Button>{' '}
                        <Button color="primary" onClick={onAction}>{action==="add" ? "Save" : "Update"}</Button>
                    </ModalFooter>
                </Modal>
            </div>
        )
    }
}

export default AddGeoDataModal;
