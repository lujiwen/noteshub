import React, { Component } from 'react';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';
import connect from "react-redux/es/connect/connect";

class OpenSheetMusicDisplay extends Component {
    constructor(props) {
      super(props);
      this.state = { dataReady: false };
      this.osmd = undefined;
      this.divRef = React.createRef();
      // this.handleClick = this.handleClick.bind(this);
    }
  
    setupOsmd() {
      const options = {
        autoResize: this.props.autoResize ? this.props.autoResize : true,
        drawTitle: this.props.drawTitle ? this.props.drawTitle : true,
      }
      this.osmd = new OSMD(this.divRef.current, options);
      this.osmd.load(this.props.file).then(() => this.osmd.render());
    }
  
    resize() {
      this.forceUpdate();
    }
  
    componentWillUnmount() {
      window.removeEventListener('resize', this.resize)
    }
  
    componentDidUpdate(prevProps) {
      if (this.props.drawTitle !== prevProps.drawTitle) {
        this.setupOsmd();
      } else {
        this.osmd.load(this.props.file).then(() => this.osmd.render());
      }
      window.addEventListener('resize', this.resize)

      if(this.props.isStartToPlay) {
        this.osmd.play()
      }
    }
  
    // Called after render
    componentDidMount() {
      this.setupOsmd();
    }
  
    render() {
      return (<div ref={this.divRef} />);
    }
  }


const mapStateToProps = (state, props) => {
  console.log("mapStateToProps: " + state.musicSheetPlayerReducer.isStartToPlay)
  return {
    isStartToPlay : state.musicSheetPlayerReducer.isStartToPlay
  };
}

const mapDispatchToProps = dispatch => ({

})

export default connect(mapStateToProps, mapDispatchToProps)(OpenSheetMusicDisplay)

