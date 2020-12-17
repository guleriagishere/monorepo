import React, {Component} from 'react';

class Tag extends Component {
  render() {
      const {label, onRemove} = this.props;
      return (
          <div className="tag">
              <span className="label">{label}</span>
              <div className="close-btn" onClick={() => onRemove(label)}><span>x</span></div>
          </div>
      )
  }
}

export default Tag;