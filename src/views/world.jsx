import React from 'react';
import ReactDOM from 'react-dom';
import NavBar from './navbar';

class World extends React.Component {
  render() {
    return (
      <div>
        <NavBar/>
      </div>
    )
  }
}

ReactDOM.render(<World/>, document.getElementById('world'));
